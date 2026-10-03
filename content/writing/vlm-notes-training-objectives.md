---
title: "VLM notes 2: training objectives"
description: "The losses behind VLMs: contrastive pretraining for the vision encoder and next-token prediction for the full model."
date: "2026-10-03"
tags:
  - Machine Learning
  - VLM
---

The [previous chapter](/writing/vlm-notes-images-to-tokens) described the forward pass of a vision-language model. This chapter turns to the question of what the model is trained to minimize.

Two different losses appear, at two different stages of training. The first is a contrastive loss, used by CLIP and SigLIP to train the vision encoder so that images and their descriptions are mapped close together. The second is the familiar next-token loss, used to train the projector and the language model to generate text about an image.

## 1. CLIP and the contrastive loss

Consider a batch of $N$ image–caption pairs. Each image is encoded by $f$ and each caption by $g$, and the results are normalized to unit length:

$$
u_i = \frac{f(I_i)}{\lVert f(I_i) \rVert}, \qquad
v_j = \frac{g(T_j)}{\lVert g(T_j) \rVert}.
$$

From these we form a similarity matrix, scaled by a temperature $\tau$:

$$
s_{ij} = \frac{u_i^\top v_j}{\tau}.
$$

Because the vectors are normalized, $u_i^\top v_j$ is the cosine similarity and lies in $[-1, 1]$. The diagonal entries $s_{ii}$ correspond to the correct pairs, and every off-diagonal entry serves as a negative example.

In the image-to-text direction, the model must pick out the correct caption for each image from among the $N$ candidates:

$$
\mathcal{L}_{i \to t} = -\frac{1}{N} \sum_{i=1}^{N} \log \frac{\exp(s_{ii})}{\sum_{j=1}^{N} \exp(s_{ij})}.
$$

The text-to-image loss $\mathcal{L}_{t \to i}$ is defined in the same way, with the sum taken over columns instead of rows. The final objective is their average:

$$
\mathcal{L}_\text{CLIP} = \tfrac{1}{2}\left(\mathcal{L}_{i \to t} + \mathcal{L}_{t \to i}\right).
$$

Seen this way, the contrastive loss is nothing more than a cross-entropy loss in which the label of row $i$ is $i$: an $N$-way classification problem that is constructed anew for every batch. The temperature controls how sharp the softmax is; CLIP learns $\log(1/\tau)$ directly and clips it so that $1/\tau \le 100$. Larger batches supply more negatives and therefore a harder task, which is why CLIP was trained with $N = 32{,}768$.

The implementation follows the formula closely:

```python
import torch
import torch.nn.functional as F

def clip_loss(img_emb, txt_emb, logit_scale):
    u = F.normalize(img_emb, dim=-1)        # (N, D)
    v = F.normalize(txt_emb, dim=-1)        # (N, D)
    logits = logit_scale * u @ v.T          # (N, N), logit_scale = 1/tau
    labels = torch.arange(len(u), device=u.device)
    return (F.cross_entropy(logits, labels) +
            F.cross_entropy(logits.T, labels)) / 2
```

A useful consequence is zero-shot classification. We embed a prompt such as `"a photo of a {class}"` for each class and predict the class $\arg\max_c\, u^\top v_c$, with no additional training.

## 2. SigLIP: replacing softmax with sigmoid

In CLIP, the softmax denominator couples every pair in the batch. SigLIP removes this coupling by treating each pair $(i, j)$ as an independent binary classification problem:

$$
\mathcal{L}_\text{SigLIP} = -\frac{1}{N} \sum_{i=1}^{N} \sum_{j=1}^{N}
\log \sigma\!\left(z_{ij}\,(t\, u_i^\top v_j + b)\right),
\qquad
z_{ij} = \begin{cases} 1 & i = j \\ -1 & i \ne j \end{cases}
$$

Both the scale $t$ and the bias $b$ are learned. The bias is initialized to a strongly negative value, because almost all pairs, $N^2 - N$ of them, are negatives. Since no normalization across the batch is required, the loss is easy to distribute across devices and performs well even with moderate batch sizes. For these reasons, many recent VLMs use a SigLIP encoder.

The difference between the two losses is easiest to see on a small example. With softmax, each row is pushed toward a single winner. With sigmoid, a pair such as "dog" and "cat" can settle at an intermediate value without affecting the diagonal.

<div data-animation="clip-matrix"></div>

## 3. Next-token prediction

Once the encoder has been trained, the complete VLM is trained in the same way as a language model. Given visual tokens $X_v$, an instruction $X_q$, and an answer $Y = (y_1, \dots, y_L)$, the model factorizes the probability of the answer autoregressively,

$$
p_\theta(Y \mid X_v, X_q) = \prod_{t=1}^{L} p_\theta(y_t \mid X_v, X_q, y_{<t}),
$$

and is trained to minimize the negative log-likelihood:

$$
\mathcal{L}_\text{LM} = -\sum_{t=1}^{L} \log p_\theta(y_t \mid X_v, X_q, y_{<t}).
$$

The essential point is that the loss is computed only on the answer tokens. The image tokens and the instruction serve as context, and the model is never asked to predict them; indeed, image tokens are not even part of the vocabulary.

In code, this is achieved by setting the labels at all non-answer positions to `-100`, a value that `cross_entropy` ignores:

```python
IGNORE = -100

def vlm_loss(logits, input_ids, answer_mask):
    # logits: (B, S, V), input_ids: (B, S)
    # answer_mask: True where the token belongs to the answer
    labels = input_ids.masked_fill(~answer_mask, IGNORE)
    # position t predicts token t+1
    logits = logits[:, :-1].reshape(-1, logits.size(-1))
    labels = labels[:, 1:].reshape(-1)
    return F.cross_entropy(logits, labels, ignore_index=IGNORE)
```

The visual token positions have no entry in `input_ids`, since they are produced by the projector, so they too are filled with `IGNORE` when the sequences are aligned.

## 4. The two-stage recipe

LLaVA divides training into two stages, summarized below.

| Stage | Data | Trained | Frozen |
| :--- | :--- | :--- | :--- |
| 1. Alignment | image–caption pairs | projector | ViT, LLM |
| 2. Instruction tuning | visual QA / chat | projector, LLM | ViT |

The first stage only has to learn the mapping $W$ from vision features into a space that the language model already understands. With every other component frozen, this stage is inexpensive and stable. The second stage teaches the language model to make use of the visual tokens when following instructions. In the basic recipe, the vision encoder remains frozen throughout, because contrastive pretraining has already given it good features; some later models unfreeze it with a small learning rate.

## Summary

The two objectives teach different skills. The contrastive losses of CLIP and SigLIP teach matching, that is, which text belongs with which image, and they produce the vision encoder. The next-token loss teaches generation, that is, how to describe an image in words, and it trains the projector and the language model. At bottom, both are cross-entropy losses. In CLIP the label is the index of the paired item; in the language model it is the next token, with every position outside the answer masked out.

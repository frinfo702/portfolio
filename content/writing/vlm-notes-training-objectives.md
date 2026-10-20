---
title: "VLM notes 2: training objectives"
description: "The losses behind VLMs: contrastive pretraining for the vision encoder and next-token prediction for the full model."
date: "2026-10-03"
tags:
  - Machine Learning
  - VLM
---

The [previous chapter](/writing/vlm-notes-images-to-tokens) followed an image through the forward pass of a vision-language model. This chapter asks what each part is trained to do.

Two losses are involved, and they are used at different times. The vision encoder is trained first, on its own, with a *contrastive* loss: given a batch of images and captions, it must tell which caption belongs to which image. CLIP and SigLIP are the two standard versions. Later, the encoder is combined with a projector and a language model, and the whole system is trained with the ordinary *next-token* loss of a language model, so that it learns to write text about an image.

## 1. CLIP and the contrastive loss

The idea behind CLIP is a matching game. Take $N$ images and their $N$ captions from the training data, shuffle the captions, and ask the model to pair them up again. A model that can do this reliably on millions of batches must have learned what images and sentences are about.

CLIP plays the game with two encoders, $f$ for images and $g$ for text. Their outputs are normalized to unit length,

$$
u_i = \frac{f(I_i)}{\lVert f(I_i) \rVert}, \qquad
v_j = \frac{g(T_j)}{\lVert g(T_j) \rVert},
$$

so that every image and every caption becomes a point on the same unit sphere. For unit vectors the dot product $u_i^\top v_j$ is the cosine of the angle between them: $1$ when they point the same way, $0$ when they are orthogonal, $-1$ when they are opposite. Dividing by a temperature $\tau$ gives the similarity matrix

$$
s_{ij} = \frac{u_i^\top v_j}{\tau}.
$$

The diagonal entries $s_{ii}$ belong to the true pairs. Every off-diagonal entry pairs an image with someone else's caption and serves as a negative example.

### The loss as classification

For image $i$, choosing its caption among the $N$ candidates is an $N$-way classification problem whose correct class is $i$. Applying a softmax across row $i$ and taking the cross-entropy gives the image-to-text loss:

$$
\mathcal{L}_{i \to t} = -\frac{1}{N} \sum_{i=1}^{N} \log \frac{\exp(s_{ii})}{\sum_{j=1}^{N} \exp(s_{ij})}.
$$

The text-to-image loss $\mathcal{L}_{t \to i}$ is the same computation applied to the columns, where each caption chooses among the images. CLIP minimizes their average:

$$
\mathcal{L}_\text{CLIP} = \tfrac{1}{2}\left(\mathcal{L}_{i \to t} + \mathcal{L}_{t \to i}\right).
$$

Figure 2.1 shows this on a toy batch of six pairs, drawn in two dimensions. During training, each image moves toward its own caption on the circle and away from the others, and the diagonal of the matrix brightens as a result. The column on the right shows each row's sum, which is always 1 under the softmax: the captions in a row compete for a single unit of probability.

<div data-animation="clip-matrix"></div>

Two hyperparameters control how hard the game is. The temperature $\tau$ sets how sharp the softmax is. CLIP learns it, starting from $\tau = 0.07$, and clips $1/\tau$ at 100 to keep training stable. The batch size $N$ sets the number of negatives. More negatives make the task harder and the learned features better, which is why CLIP was trained with $N = 32{,}768$.

In code, the loss is a cross-entropy whose labels are simply $0, 1, \dots, N-1$:

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

A trained CLIP model can classify images without further training. Embed one prompt per class, such as `"a photo of a dog"`, and predict the class $c$ that maximizes $u^\top v_c$. This is called zero-shot classification.

## 2. SigLIP: one sigmoid per pair

The softmax in CLIP couples all entries of a row: raising one probability lowers the others. To compute the denominator, every device in a distributed run needs the embeddings of the whole batch. SigLIP removes this coupling. It treats each entry $(i, j)$ as a separate yes-or-no question, "do this image and this caption belong together?", and answers it with a sigmoid:

$$
\mathcal{L}_\text{SigLIP} = -\frac{1}{N} \sum_{i=1}^{N} \sum_{j=1}^{N}
\log \sigma\!\left(z_{ij}\,(t\, u_i^\top v_j + b)\right),
\qquad
z_{ij} = \begin{cases} 1 & i = j \\ -1 & i \ne j. \end{cases}
$$

The label $z_{ij}$ is $+1$ for a true pair and $-1$ otherwise. The scale $t$ and the bias $b$ are both learned. The bias starts at a strongly negative value, $b = -10$, because $N^2 - N$ of the $N^2$ pairs are negatives, and a model that begins by answering "no" to everything is already almost right.

Switch Figure 2.1 to SigLIP to see the difference. Each cell now moves independently, and the row sums are no longer fixed at 1. The dog and cat images, which look alike, can both give a moderate probability to the other's caption without taking anything away from their own diagonal entries.

Because no normalization across the batch is needed, the loss can be computed in chunks across devices, and it trains well even at moderate batch sizes. For these reasons many recent VLMs, PaliGemma and Idefics2 among them, use a SigLIP encoder.

## 3. Next-token prediction

Once the encoder is trained, the full VLM is assembled as described in the previous chapter and trained like a language model. A training example has three parts: visual tokens $X_v$, an instruction $X_q$, and an answer $Y = (y_1, \dots, y_L)$. The model factorizes the probability of the answer one token at a time,

$$
p_\theta(Y \mid X_v, X_q) = \prod_{t=1}^{L} p_\theta(y_t \mid X_v, X_q, y_{<t}),
$$

and is trained to minimize the negative log-likelihood:

$$
\mathcal{L}_\text{LM} = -\sum_{t=1}^{L} \log p_\theta(y_t \mid X_v, X_q, y_{<t}).
$$

The important detail is in the sum: it runs over the answer tokens only. The image and the instruction are context. The model conditions on them but is never asked to predict them; the image tokens could not be predicted in any case, since they are not in the vocabulary.

In code, this is done through the labels. Position $t$ of the output predicts token $t+1$ of the input, so the labels are the inputs shifted one place to the left. Every label outside the answer is then set to `-100`, the value that `cross_entropy` ignores, and the loss is averaged over what remains. Figure 2.2 walks through these steps on a short example.

<div data-animation="loss-mask"></div>

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

The visual positions have no entry in `input_ids` of their own, because their vectors come from the projector. When the sequences are aligned, those positions are filled with `IGNORE` as well.

## 4. The two-stage recipe

LLaVA trains the assembled model in two stages, which differ in their data and in which parts are allowed to change.

| Stage | Data | Trained | Frozen |
| :--- | :--- | :--- | :--- |
| 1. Alignment | image–caption pairs | projector | ViT, LLM |
| 2. Instruction tuning | visual QA and chat | projector, LLM | ViT |

In stage 1 the only new component, the projector, learns to map vision features into a space the language model already understands. Everything else is frozen, so this stage is cheap and stable. LLaVA-1.5 uses about 558K caption pairs for it. In stage 2 the language model is unfrozen as well and learns to use the visual tokens when following instructions, on about 665K conversations.

<div data-animation="two-stage"></div>

Note what *frozen* means here. In stage 1 the loss is computed at the output of the language model, so the gradient has to travel back through all of the language model's layers to reach the projector. The language model's weights are not updated, but its layers still pass the gradient along. The vision encoder, in contrast, receives no gradient at all in the basic recipe, because contrastive pretraining has already given it good features. Some later models unfreeze it in stage 2 with a small learning rate.

## Summary

The two objectives teach different skills. The contrastive losses of CLIP and SigLIP teach *matching*, which caption goes with which image, and they produce the vision encoder. The next-token loss teaches *generation*, how to describe an image in words, and it trains the projector and then the language model.

Both are cross-entropy losses underneath. In CLIP the target for row $i$ is the index $i$ of the paired caption. In SigLIP each cell has its own binary target. In the language model the target at each position is the next token, and every position outside the answer is masked out.

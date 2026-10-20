---
title: "VLM notes 1: from pixels to tokens"
description: "How a vision-language model turns an image into a sequence of vectors that a language model can read."
date: "2026-10-02"
tags:
  - Machine Learning
  - VLM
---

A language model reads a sequence of vectors. Each word, or more precisely each token, is looked up in an embedding table, and the resulting vectors are passed through a stack of transformer layers. A vision-language model (VLM) keeps this machinery unchanged and adds one thing: a way to turn an image into more vectors of the same kind. Once that is done, the language model reads the image the same way it reads text.

This chapter follows an image through that conversion. We use LLaVA-1.5 as the running example, because its design is simple and many later models share it. LLaVA-1.5 has three components:

1. A **vision encoder**, a Vision Transformer (ViT) taken from CLIP, which turns the image into one feature vector per image patch.
2. A **projector**, a small MLP, which maps each feature vector into the language model's embedding space.
3. The **language model** itself, which receives the projected vectors in place of an `<image>` placeholder in the prompt.

Figure 1.1 shows the whole path on a toy image. Use the chapter strip to replay any step; the rest of the chapter explains each one in turn.

<div data-animation="patchify"></div>

## 1. Cutting the image into patches

A transformer takes a sequence of vectors as input, so the first question is what the elements of that sequence should be. Individual pixels are too fine. A 336 × 336 image has 112,896 pixels, and self-attention compares every element with every other element, which would mean more than $10^{10}$ comparisons per layer. The ViT instead groups pixels into square patches and treats each patch as one element.

Let the image be $x \in \mathbb{R}^{H \times W \times C}$, where $C = 3$ for RGB, and let $P$ be the patch size. Cutting the image into non-overlapping $P \times P$ squares gives

$$
N = \frac{HW}{P^2}
$$

patches. Each patch holds $P \cdot P \cdot C$ numbers. Reading those numbers out in a fixed order, row by row, gives a vector

$$
x_p^i \in \mathbb{R}^{P^2 C}, \qquad i = 1, \dots, N.
$$

This step is called *flattening*. It throws away nothing; it only changes the shape of the data from a small square to a line.

### Linear embedding

The flattened vectors are then mapped to the model width $D$ by one matrix $E \in \mathbb{R}^{(P^2 C) \times D}$, the same matrix for every patch. A learned vector $E_\text{pos}$ for each position is added to the result:

$$
z_0 = [\,x_\text{cls};\; x_p^1 E;\; x_p^2 E;\; \dots;\; x_p^N E\,] + E_\text{pos}.
$$

The position term is necessary because of a property of attention. Self-attention computes a weighted sum over its inputs, and a sum does not depend on the order of its terms. If two patches were swapped, attention alone would produce the same outputs, swapped. $E_\text{pos}$ breaks this symmetry by giving each position its own offset, and it is the only place where the model learns where a patch came from.

The vector $x_\text{cls}$ is an extra learned token used by the original ViT for classification. LLaVA discards its output and keeps only the $N$ patch tokens.

Flattening a patch and multiplying it by $E$ is exactly a convolution whose kernel size and stride both equal $P$. Implementations use this form because it does the cutting, flattening, and projection in one call:

```python
import torch.nn as nn

class PatchEmbed(nn.Module):
    def __init__(self, patch=14, in_ch=3, dim=1024):
        super().__init__()
        self.proj = nn.Conv2d(in_ch, dim, kernel_size=patch, stride=patch)

    def forward(self, x):                      # x: (B, 3, H, W)
        x = self.proj(x)                       # (B, D, H/P, W/P)
        return x.flatten(2).transpose(1, 2)    # (B, N, D)
```

### Resolution and the number of tokens

The number of patches depends on the square of the image side. For a fixed patch size $P = 14$:

| Resolution | Grid | $N$ | Attention scores $N^2$ |
| :--- | :---: | ---: | ---: |
| 224 × 224 | 16 × 16 | 256 | 65,536 |
| 336 × 336 | 24 × 24 | 576 | 331,776 |
| 448 × 448 | 32 × 32 | 1,024 | 1,048,576 |
| 672 × 672 | 48 × 48 | 2,304 | 5,308,416 |

Doubling the side length multiplies $N$ by four. Because attention compares every pair, its cost grows with $N^2$ and therefore with the fourth power of the side length. The image also occupies part of the language model's context window: at 672 pixels, a single image uses more than half of a 4,096-token context.

<div data-animation="token-budget"></div>

This is the reason high-resolution models do not simply feed in larger images. They split the image into tiles that are encoded separately, or they merge neighboring tokens after the encoder, as described in Section 3.

## 2. The encoder

The sequence $z_0$ passes through $L$ identical transformer blocks. CLIP's ViT-L/14 has $L = 24$ and width $D = 1024$. Each block applies two sub-layers, each wrapped in a residual connection and preceded by layer normalization (LN):

$$
\begin{aligned}
z'_\ell &= z_{\ell-1} + \operatorname{MSA}(\operatorname{LN}(z_{\ell-1})) \\
z_\ell  &= z'_\ell + \operatorname{MLP}(\operatorname{LN}(z'_\ell))
\end{aligned}
$$

The MLP acts on each token separately. The multi-head self-attention (MSA) is the only place where tokens exchange information. For each token it computes a query, a key, and a value, $Q = zW_Q$, $K = zW_K$, $V = zW_V$, and combines them as

$$
\operatorname{Attention}(Q, K, V) = \operatorname{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right) V.
$$

Row $i$ of the $N \times N$ matrix $\operatorname{softmax}(QK^\top/\sqrt{d_k})$ is a probability distribution that says how much token $i$ takes from each of the others. The division by $\sqrt{d_k}$ keeps the dot products from growing with the key dimension $d_k$; without it the softmax would saturate and its gradients would vanish. Because of the residual connections, each layer adds an update to the token rather than replacing it.

Figure 1.3 shows one row of this matrix on a $6 \times 6$ patch grid. Move the pointer over the image to choose the query patch.

<div data-animation="attention"></div>

The encoder uses no mask: every patch may attend to every other patch, including those below and to the right of it. This differs from the language model, which applies a causal mask so that each position sees only earlier positions. Switching Figure 1.3 to the causal mask shows how much of the image a patch would lose under that rule. An image has no natural reading order, so the encoder has no reason to impose one.

One practical detail matters when reusing a pretrained encoder. LLaVA takes its features from the second-to-last layer rather than the last. The last layer has been shaped most strongly by CLIP's training objective, which only asks whether an image matches a caption as a whole. The layer before it keeps more information about individual regions, which the language model needs in order to answer questions about details.

## 3. The projector

The encoder outputs $Z_v \in \mathbb{R}^{N \times D_v}$, but the language model expects vectors of its own width $D_t$. For LLaVA-1.5 these are $D_v = 1024$ and $D_t = 4096$. More importantly, the two models were trained separately, so even with matching widths the encoder's vectors would mean nothing to the language model. The projector learns the translation between the two spaces.

The original LLaVA used a single linear layer,

$$
H_v = Z_v W, \qquad W \in \mathbb{R}^{D_v \times D_t},
$$

and LLaVA-1.5 replaced it with a two-layer MLP, which works noticeably better:

$$
H_v = \operatorname{GELU}(Z_v W_1)\, W_2.
$$

```python
class Projector(nn.Module):
    def __init__(self, d_vision=1024, d_text=4096):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(d_vision, d_text),
            nn.GELU(),
            nn.Linear(d_text, d_text),
        )

    def forward(self, z):    # (B, N, D_v)
        return self.net(z)   # (B, N, D_t)
```

This projector acts on each token independently, so the number of tokens stays $N$. Other designs also use the projector to shorten the sequence:

- **Merging neighbors.** Each $2 \times 2$ block of tokens is concatenated into one token, often called pixel shuffle. The sequence becomes four times shorter and each token four times wider, after which an MLP maps it to $D_t$.
- **A resampler.** A fixed set of $M$ learned query vectors cross-attends to all patch features. The output always has $M$ tokens, whatever the resolution. BLIP-2's Q-Former uses $M = 32$ and Flamingo's Perceiver resampler uses $M = 64$.

<div data-animation="projector"></div>

Fewer tokens make the language model cheaper to run and leave more of the context for text. The price is detail. Reading small text in an image or counting objects needs fine spatial information, and every merge discards some of it. A resampler loses the most, because its outputs are no longer tied to particular image regions at all.

## 4. Joining the image and the text

Text tokens are embedded in the usual way, $H_t = \operatorname{Embed}(t_1, \dots, t_T)$, and the visual tokens are inserted among them:

$$
h = [\,H_v;\; H_t\,] \in \mathbb{R}^{(N + T) \times D_t}.
$$

In practice the prompt contains a single placeholder token such as `<image>`, and the model replaces that one position with the $N$ projected vectors:

```python
def build_inputs(llm, vit, projector, image, input_ids, image_pos):
    vis = projector(vit(image))            # (1, N, D_t)
    txt = llm.embed_tokens(input_ids)      # (1, T, D_t)
    # replace the single <image> slot with N visual tokens
    return torch.cat([txt[:, :image_pos], vis, txt[:, image_pos + 1:]], dim=1)
```

From this point the language model runs exactly as it does on text, with its causal mask in place. It has no separate mode for images. The visual tokens are simply earlier positions in the sequence, and every later text position can attend to them. They are sometimes called *soft tokens*: they live in the embedding space like word embeddings, but they do not correspond to any entry in the vocabulary.

## Summary

The table traces the shapes through LLaVA-1.5 for one 336 × 336 image and a prompt of $T$ text tokens.

| Step | Operation | Output shape |
| :--- | :--- | :--- |
| Input | RGB image | $336 \times 336 \times 3$ |
| Patchify and flatten | $P = 14$ | $576 \times 588$ |
| Embed | $E$, $E_\text{pos}$ | $576 \times 1024$ |
| Encode | 24 ViT blocks, second-to-last layer | $576 \times 1024$ |
| Project | 2-layer MLP | $576 \times 4096$ |
| Join | replace `<image>` | $(576 + T) \times 4096$ |

Two points are worth remembering. First, the number of visual tokens $N = HW/P^2$ sets the cost of the whole model, since it grows with the square of the resolution and attention grows with the square of $N$. Second, the projector is by far the smallest of the three components, yet it is the only one that starts from random weights. How it is trained, together with the encoder and the language model, is the subject of the next chapter.

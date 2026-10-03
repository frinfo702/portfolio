---
title: "VLM notes 1: from pixels to tokens"
description: "How a vision-language model turns an image into a sequence of tokens that a language model can read."
date: "2026-10-02"
tags:
  - Machine Learning
  - VLM
---

A vision-language model (VLM) is best understood as a large language model that receives a few extra "words" in its input, words that happen to have been computed from an image. This chapter describes how those words are made.

In the LLaVA family of models, which we use as the running example, the input side consists of three stages. A vision encoder, usually a Vision Transformer (ViT), converts the image into a set of patch features. A small projector maps these features into the embedding space of the language model. Finally, the resulting visual tokens are concatenated with the text tokens, and the combined sequence is passed to the language model.

<div data-animation="patchify"></div>

## 1. Patchify

Let the image be $x \in \mathbb{R}^{H \times W \times C}$ and let $P$ be the patch size. The image is divided into a grid of non-overlapping $P \times P$ patches, giving

$$
N = \frac{HW}{P^2}, \qquad x_p^i \in \mathbb{R}^{P^2 C} \quad (i = 1, \dots, N),
$$

where each $x_p^i$ is one patch flattened into a vector. Each of these vectors is then mapped to the model width $D$ by a shared linear projection $E$, and a learned position embedding is added:

$$
z_0 = [\,x_\text{cls};\; x_p^1 E;\; x_p^2 E;\; \dots;\; x_p^N E\,] + E_\text{pos},
\qquad E \in \mathbb{R}^{(P^2 C) \times D}.
$$

The position embedding $E_\text{pos}$ is essential. Attention by itself is invariant to the order of its inputs, so without $E_\text{pos}$ the model would have no way of knowing where in the image a patch came from. The classification token $x_\text{cls}$ is optional, and many VLMs discard it and use all patch tokens instead.

The number of tokens depends strongly on the resolution, as the following table shows.

| Resolution | $P$ | Grid | $N$ |
| :--- | :---: | :---: | ---: |
| 224 × 224 | 16 | 14 × 14 | 196 |
| 224 × 224 | 14 | 16 × 16 | 256 |
| 336 × 336 | 14 | 24 × 24 | 576 |

Because $N$ grows with the square of the side length, doubling the resolution produces four times as many visual tokens. Since the cost of attention is $O(N^2)$, the computational cost grows faster still. This is the reason high-resolution VLMs divide the image into tiles or merge neighboring tokens.

Flattening a patch and multiplying it by $E$ is equivalent to a convolution whose kernel size and stride are both $P$. Implementations usually take advantage of this:

```python
import torch.nn as nn

class PatchEmbed(nn.Module):
    def __init__(self, patch=14, in_ch=3, dim=1024):
        super().__init__()
        self.proj = nn.Conv2d(in_ch, dim, kernel_size=patch, stride=patch)

    def forward(self, x):            # x: (B, 3, H, W)
        x = self.proj(x)             # (B, D, H/P, W/P)
        return x.flatten(2).transpose(1, 2)  # (B, N, D)
```

## 2. The ViT block

The sequence $z_0$ is processed by $L$ identical pre-norm transformer encoder blocks:

$$
\begin{aligned}
z'_\ell &= \operatorname{MSA}(\operatorname{LN}(z_{\ell-1})) + z_{\ell-1} \\
z_\ell  &= \operatorname{MLP}(\operatorname{LN}(z'_\ell)) + z'_\ell
\end{aligned}
$$

Inside the multi-head self-attention (MSA), the queries, keys, and values are computed as $Q = zW_Q$, $K = zW_K$, and $V = zW_V$, and combined as

$$
\operatorname{Attention}(Q, K, V) = \operatorname{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right) V.
$$

The matrix $QK^\top$ has shape $N \times N$, so every patch attends to every other patch. Unlike the language model, the encoder uses no causal mask. The factor $\sqrt{d_k}$ prevents the dot products from growing with the dimension, which would otherwise saturate the softmax. The residual connections mean that each layer adds to the representation rather than replacing it.

One practical detail deserves mention. VLMs often take their features from the second-to-last layer of the encoder rather than the last. The final layer is specialized for the encoder's own pretraining objective, such as CLIP's image–text matching, whereas the preceding layer retains more spatial detail.

## 3. The projector

The encoder produces $Z_v \in \mathbb{R}^{N \times D_v}$, but the language model expects vectors of width $D_t$, for example 1024 versus 4096. The projector bridges this gap. In the original LLaVA it is a single linear layer,

$$
H_v = Z_v W, \qquad W \in \mathbb{R}^{D_v \times D_t},
$$

and LLaVA-1.5 replaces it with a two-layer MLP:

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

    def forward(self, z):   # (B, N, D_v)
        return self.net(z)  # (B, N, D_t)
```

Note that this projector does not change the number of tokens $N$. Other designs use the projector to compress the sequence. Pooling or pixel shuffle merges each $2 \times 2$ neighborhood into a single token, reducing $N$ to $N/4$ while the channel dimension grows fourfold. A Q-Former or Perceiver resampler instead uses a fixed set of $M$ learned queries that cross-attend to the patch features, so the output always has $M$ tokens regardless of resolution. The trade-off is that fewer tokens make the model cheaper and leave more context for text, at the cost of fine detail such as small text in images or the ability to count objects.

## 4. Joining with text

The text tokens pass through the language model's ordinary embedding table, $H_t = \operatorname{Embed}(t_1, \dots, t_T)$, and the two sequences are concatenated:

$$
h = [\,H_v;\; H_t\,] \in \mathbb{R}^{(N + T) \times D_t}.
$$

In practice the prompt contains a placeholder such as `<image>`, and that single position is replaced by the $N$ visual embeddings:

```python
def build_inputs(llm, vit, projector, image, input_ids, image_pos):
    vis = projector(vit(image))            # (1, N, D_t)
    txt = llm.embed_tokens(input_ids)      # (1, T, D_t)
    # replace the single <image> slot with N visual tokens
    return torch.cat([txt[:, :image_pos], vis, txt[:, image_pos + 1:]], dim=1)
```

From this point on, the language model runs exactly as usual, with a causal mask. It has no special mode for vision; the visual tokens are simply earlier positions in the sequence that it can attend to.

## Summary

An image passes through four steps: it is cut into patches, encoded by a ViT, mapped by a projector, and inserted into the language model as soft tokens in its embedding space. The number of tokens $N = HW/P^2$ is the main factor that determines cost, since it grows quadratically with resolution and attention grows quadratically with $N$. The projector is small compared with the encoder and the language model, but it is the only component that must be trained from scratch. How that training is done is the subject of the next chapter.

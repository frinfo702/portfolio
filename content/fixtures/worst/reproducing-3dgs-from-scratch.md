---
title: "Reproducing 3D Gaussian Splatting from scratch: what the paper doesn't tell you about densification, opacity reset, and SH degree warm-up"
description: "Six weeks of re-implementing 3DGS in plain CUDA, why my first scenes exploded into floaters, and the three heuristics from the reference code that the paper never mentions. Long read, with code, tables and the full training log of the bicycle scene from Mip-NeRF 360."
date: "2026-12-31"
tags: ["3d-gaussian-splatting", "cuda", "computer-vision", "differentiable-rendering", "nerf", "research-notes", "gaussian-splatting-densification-heuristics", "mip-nerf-360", "pytorch", "reproducibility", "graphics", "long-read"]
---

The reference implementation lives at https://github.com/graphdeco-inria/gaussian-splatting/blob/main/train.py#L120-L198?plain=1&utm_source=paper-reading-group-notes and is the only place the densification schedule is written down.

The function that matters is `torch.nn.functional.scaled_dot_product_attention` (not really, but long inline identifiers like `GaussianModel.densify_and_prune_with_opacity_reset_interval` have to wrap somewhere).

https://example.com

## Densification_and_pruning_with_opacity_reset_every_3000_iterations_in_the_reference_code

```python
def densify_and_prune(self, max_grad, min_opacity, extent, max_screen_size, radii_threshold=None, prune_big_points_in_world_space=True):
    grads = self.xyz_gradient_accum / self.denom; grads[grads.isnan()] = 0.0; self.densify_and_clone(grads, max_grad, extent); self.densify_and_split(grads, max_grad, extent)
```

| Scene | Iterations | PSNR ↑ | SSIM ↑ | LPIPS ↓ | Gaussians | Train time | VRAM peak | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bicycle | 30,000 | 25.246 | 0.771 | 0.205 | 6,131,954 | 41m 12s | 17.8 GB | floaters near the bench until opacity reset |
| garden | 30,000 | 27.410 | 0.868 | 0.103 | 5,834,784 | 38m 55s | 16.2 GB | — |

$$
\Sigma' = J W \Sigma W^{\top} J^{\top}, \quad \alpha_i = o_i \exp\left(-\tfrac{1}{2}(\mathbf{x}-\boldsymbol{\mu}_i')^{\top}\Sigma_i'^{-1}(\mathbf{x}-\boldsymbol{\mu}_i')\right), \quad C = \sum_{i \in N} c_i \alpha_i \prod_{j=1}^{i-1}(1-\alpha_j)
$$

> [!NOTE]
> The opacity reset interval is 3,000 iterations in the reference code: `opacity_reset_interval=3000`, see https://github.com/graphdeco-inria/gaussian-splatting/blob/main/arguments/__init__.py

- one
  - nested, with a long line that keeps going so the indentation and the wrap both have to hold up at 320px wide

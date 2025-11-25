#!/usr/bin/env python3
"""
Smooth edges for an image with a magenta background (#FF00FF).

Usage:
    python smooth_edges.py input.png output.png [--tolerance 80] [--upscale 2] [--blur 2] [--bg "#ffffff"]

Options:
    --tolerance   how close a pixel must be to magenta to be considered background (0-442, default 80)
    --upscale     upscale factor before blurring to improve smoothness (1 = no upscale, default 2)
    --blur        Gaussian blur radius applied to alpha mask (default 2)
    --bg          optional background color (e.g. "#ffffff"). If omitted, leaves transparent background.
"""
import sys
import argparse
from PIL import Image, ImageFilter

MAGENTA = (255, 0, 255)

def is_background_pixel(px, tolerance):
    # squared distance in RGB space
    dr = px[0] - MAGENTA[0]
    dg = px[1] - MAGENTA[1]
    db = px[2] - MAGENTA[2]
    return (dr*dr + dg*dg + db*db) <= (tolerance*tolerance)

def make_mask(img, tolerance):
    w, h = img.size
    pixels = img.load()
    mask = Image.new("L", (w, h), 255)
    mpx = mask.load()
    for y in range(h):
        for x in range(w):
            if is_background_pixel(pixels[x, y], tolerance):
                mpx[x, y] = 0
            else:
                mpx[x, y] = 255
    return mask

def smooth_alpha(img, mask, upscale, blur_radius):
    if upscale > 1:
        new_size = (img.width * upscale, img.height * upscale)
        img = img.resize(new_size, resample=Image.LANCZOS)
        mask = mask.resize(new_size, resample=Image.LANCZOS)
    # Blur mask to anti-alias edges
    mask = mask.filter(ImageFilter.GaussianBlur(blur_radius))
    # Downscale back if we upscaled
    if upscale > 1:
        img = img.resize((img.width // upscale, img.height // upscale), resample=Image.LANCZOS)
        mask = mask.resize((mask.width // upscale, mask.height // upscale), resample=Image.LANCZOS)
    return img, mask

def main():
    p = argparse.ArgumentParser()
    p.add_argument("input")
    p.add_argument("output")
    p.add_argument("--tolerance", type=int, default=80)
    p.add_argument("--upscale", type=int, default=2)
    p.add_argument("--blur", type=float, default=2.0)
    p.add_argument("--bg", default=None, help="Optional background color (e.g. '#ffffff'). If omitted, output uses transparency.")
    args = p.parse_args()

    img = Image.open(args.input).convert("RGBA")
    mask = make_mask(img, args.tolerance)
    img_no_alpha = img.convert("RGB")  # we'll apply alpha from mask
    img_smooth, mask_smooth = smooth_alpha(img_no_alpha, mask, args.upscale, args.blur)

    # add mask as alpha
    img_smooth.putalpha(mask_smooth)

    if args.bg:
        # composite over chosen background color
        bg = Image.new("RGBA", img_smooth.size, args.bg)
        out = Image.alpha_composite(bg, img_smooth)
    else:
        out = img_smooth

    out.save(args.output, "PNG")
    print("Saved", args.output)

if __name__ == "__main__":
    main()
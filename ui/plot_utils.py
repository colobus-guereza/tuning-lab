# -*- coding: utf-8 -*-
"""
Plot Utilities: Visualization utilities for tonefield coordinate system

Reusable functions for drawing squares, ellipses, hit points, etc.
"""

import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
from typing import Tuple, Optional, List


def draw_square_boundary(ax, size: float, color: str = 'blue', linewidth: float = 2, label: str = 'Boundary'):
    """Draw square tonefield boundary"""
    square = patches.Rectangle(
        (-size / 2, -size / 2),
        size,
        size,
        linewidth=linewidth,
        edgecolor=color,
        facecolor='none',
        label=label
    )
    ax.add_patch(square)
    return square


def draw_ellipse(
    ax,
    center: Tuple[float, float],
    width: float,
    height: float,
    angle: float = 0,
    color: str = 'green',
    linewidth: float = 1.5,
    linestyle: str = '--',
    alpha: float = 0.7,
    label: str = 'Target zone'
):
    """Draw ellipse area (hit target zone)"""
    ellipse = patches.Ellipse(
        center,
        width=width,
        height=height,
        angle=angle,
        linewidth=linewidth,
        edgecolor=color,
        facecolor='none',
        linestyle=linestyle,
        alpha=alpha,
        label=label
    )
    ax.add_patch(ellipse)
    return ellipse


def draw_hit_point(
    ax,
    L: float,
    S: float,
    strength: float,
    base_size: float = 50,
    max_size: float = 500,
    color: str = 'red',
    edge_color: str = 'darkred',
    alpha: float = 0.6,
    show_label: bool = True
):
    """Draw hit point (size proportional to strength)"""
    marker_size = base_size + strength * max_size

    scatter = ax.scatter(
        L, S,
        s=marker_size,
        c=color,
        alpha=alpha,
        edgecolors=edge_color,
        linewidth=2,
        label=f'Hit (strength={strength:.2f})',
        zorder=10
    )

    if show_label:
        ax.text(
            L, S + 5,
            f'({L:.1f}, {S:.1f})',
            ha='center',
            fontsize=10,
            bbox=dict(boxstyle='round', facecolor='white', alpha=0.8),
            zorder=11
        )

    return scatter


def setup_tonefield_axes(
    ax,
    field_size: float = 100,
    title: str = 'Tonefield Coordinate System',
    show_grid: bool = True
):
    """Setup tonefield coordinate axes"""
    ax.set_xlim(-field_size / 2, field_size / 2)
    ax.set_ylim(-field_size / 2, field_size / 2)
    ax.set_aspect('equal')

    if show_grid:
        ax.grid(True, alpha=0.3, linestyle=':', linewidth=0.5)
    ax.axhline(y=0, color='k', linewidth=0.5, alpha=0.5)
    ax.axvline(x=0, color='k', linewidth=0.5, alpha=0.5)

    ax.set_xlabel('L (Long dimension)', fontsize=12)
    ax.set_ylabel('S (Short dimension)', fontsize=12)
    ax.set_title(title, fontsize=14, fontweight='bold')


if __name__ == "__main__":
    print("Plot utilities test")
    fig, ax = plt.subplots(figsize=(8, 8))
    setup_tonefield_axes(ax)
    draw_square_boundary(ax, 100)
    draw_hit_point(ax, L=10, S=-5, strength=0.7)
    plt.tight_layout()
    plt.savefig('tonefield_test.png', dpi=150)
    print("Test plot saved as 'tonefield_test.png'")

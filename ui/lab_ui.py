# -*- coding: utf-8 -*-
"""
Tuning Lab UI: Streamlit-based tuning laboratory interface

Input tuning errors and visualize hit points in tonefield coordinate system
"""

import streamlit as st
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from models.hit_model import get_active_model


def create_tonefield_plot(L: float = 0, S: float = 0, strength: float = 0):
    """
    Create tonefield coordinate system plot

    Args:
        L: Long dimension coordinate
        S: Short dimension coordinate
        strength: Hit strength (0.0 ~ 1.0)
    """
    fig, ax = plt.subplots(figsize=(8, 8))

    # Square tonefield area
    field_size = 100

    # Set axes
    ax.set_xlim(-field_size / 2, field_size / 2)
    ax.set_ylim(-field_size / 2, field_size / 2)
    ax.set_aspect('equal')
    ax.grid(True, alpha=0.3)
    ax.axhline(y=0, color='k', linewidth=0.5)
    ax.axvline(x=0, color='k', linewidth=0.5)

    # Tonefield boundary (square)
    square = patches.Rectangle(
        (-field_size / 2, -field_size / 2),
        field_size,
        field_size,
        linewidth=2,
        edgecolor='blue',
        facecolor='none',
        label='Tonefield boundary'
    )
    ax.add_patch(square)

    # Hit point (if exists)
    if strength > 0:
        # Marker size proportional to hit strength
        marker_size = 50 + strength * 500
        ax.scatter(
            L, S,
            s=marker_size,
            c='red',
            alpha=0.6,
            edgecolors='darkred',
            linewidth=2,
            label=f'Hit point (strength={strength:.2f})'
        )

        # Coordinate label
        ax.text(
            L, S + 5,
            f'({L:.1f}, {S:.1f})',
            ha='center',
            fontsize=10,
            bbox=dict(boxstyle='round', facecolor='white', alpha=0.7)
        )

    ax.set_xlabel('L (Long dimension)', fontsize=12)
    ax.set_ylabel('S (Short dimension)', fontsize=12)
    ax.set_title('Tonefield Coordinate System', fontsize=14, fontweight='bold')
    ax.legend(loc='upper right')

    return fig


def main():
    """Streamlit main application"""

    # Page config
    st.set_page_config(
        page_title="Tuning Lab",
        page_icon="🎹",
        layout="wide"
    )

    # Title
    st.title("🎹 Tuning Lab: Piano Tuning Laboratory")
    st.markdown("---")

    # Sidebar: Model info
    with st.sidebar:
        st.header("📊 Model Info")
        model = get_active_model()
        model_info = model.get_model_info()

        st.write(f"**Name:** {model_info['name']}")
        st.write(f"**Version:** {model_info['version']}")
        st.write(f"**Description:** {model_info['description']}")

        if 'formula' in model_info:
            st.subheader("Formula")
            st.code(f"L = {model_info['formula']['L']}", language="python")
            st.code(f"S = {model_info['formula']['S']}", language="python")
            st.code(f"strength = {model_info['formula']['strength']}", language="python")

    # Main layout: 2 columns
    col1, col2 = st.columns([1, 2])

    with col1:
        st.header("🎛️ Tuning Error Input")
        st.markdown("Enter tuning errors (unit: cents)")

        # Tuning error inputs
        tonic = st.number_input(
            "**Tonic**",
            min_value=-50.0,
            max_value=50.0,
            value=0.0,
            step=0.1,
            format="%.1f",
            help="Tonic pitch error (cents)"
        )

        octave = st.number_input(
            "**Octave**",
            min_value=-50.0,
            max_value=50.0,
            value=0.0,
            step=0.1,
            format="%.1f",
            help="Octave pitch error (cents)"
        )

        fifth = st.number_input(
            "**Fifth**",
            min_value=-50.0,
            max_value=50.0,
            value=0.0,
            step=0.1,
            format="%.1f",
            help="Fifth pitch error (cents)"
        )

        st.markdown("---")

        # Predict button
        if st.button("🎯 Predict Hit Point", type="primary", use_container_width=True):
            st.session_state['prediction_made'] = True
            st.session_state['tonic'] = tonic
            st.session_state['octave'] = octave
            st.session_state['fifth'] = fifth

        # Reset button
        if st.button("🔄 Reset", use_container_width=True):
            st.session_state['prediction_made'] = False

    with col2:
        st.header("📍 Tonefield Visualization")

        # Perform prediction
        if st.session_state.get('prediction_made', False):
            tonic = st.session_state['tonic']
            octave = st.session_state['octave']
            fifth = st.session_state['fifth']

            # Model prediction
            model = get_active_model()
            L, S, strength = model.predict(tonic, octave, fifth)

            # Display results
            st.success("✅ Prediction Complete!")

            result_col1, result_col2, result_col3 = st.columns(3)
            with result_col1:
                st.metric("L (Long)", f"{L:.2f}")
            with result_col2:
                st.metric("S (Short)", f"{S:.2f}")
            with result_col3:
                st.metric("Strength", f"{strength:.2f}")

            # Tonefield plot
            fig = create_tonefield_plot(L, S, strength)
            st.pyplot(fig)

        else:
            # Initial state: empty plot
            st.info("👈 Enter tuning errors and click 'Predict Hit Point' button")
            fig = create_tonefield_plot()
            st.pyplot(fig)

    # Bottom: Save experiment data (future feature)
    st.markdown("---")
    with st.expander("💾 Save Experiment Data (Coming Soon)"):
        st.write("Save experimental data to samples.json")
        st.write("To be implemented")


if __name__ == "__main__":
    main()

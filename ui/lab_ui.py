# -*- coding: utf-8 -*-
"""
Tuning Lab UI: Streamlit-based tuning laboratory interface

Input tuning errors and visualize hit points in tonefield coordinate system
"""

import streamlit as st
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import plotly.graph_objects as go
from streamlit_plotly_events import plotly_events
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

    # Initialize session state for selected coordinates
    if 'selected_coords' not in st.session_state:
        st.session_state['selected_coords'] = []

    # Create interactive Plotly coordinate system
    fig = go.Figure()

    # Tonefield parameters
    a = 0.60  # short axis (S direction)
    b = 0.85  # long axis (L direction)

    # Add tonefield ellipse (using Scatter with fill)
    theta = np.linspace(0, 2*np.pi, 400)
    ellipse_x = a * np.cos(theta)
    ellipse_y = b * np.sin(theta)

    fig.add_trace(go.Scatter(
        x=ellipse_x,
        y=ellipse_y,
        mode='lines',
        name='Tonefield',
        line=dict(color='gray'),
        fill='toself',
        fillcolor='rgba(173, 216, 230, 0.3)',
        hoverinfo='skip'
    ))

    # Add square boundary
    fig.add_shape(
        type="rect",
        x0=-1, y0=-1, x1=1, y1=1,
        line=dict(color="blue", width=3),
        fillcolor="rgba(0,0,0,0)"
    )

    # Add coordinate axes
    fig.add_shape(type="line", x0=-1.2, y0=0, x1=1.2, y1=0,
                  line=dict(color="black", width=2))
    fig.add_shape(type="line", x0=0, y0=-1.2, x1=0, y1=1.2,
                  line=dict(color="black", width=2))

    # Add invisible grid of clickable points (100x100 grid)
    x_grid = np.linspace(-1, 1, 100)
    y_grid = np.linspace(-1, 1, 100)
    xx, yy = np.meshgrid(x_grid, y_grid)
    x_flat = xx.flatten()
    y_flat = yy.flatten()

    fig.add_trace(go.Scatter(
        x=x_flat,
        y=y_flat,
        mode='markers',
        marker=dict(size=1, color='rgba(0,0,0,0)', opacity=0),  # Invisible
        hoverinfo='skip',
        showlegend=False,
        name='Grid'
    ))

    # Add origin marker
    fig.add_trace(go.Scatter(
        x=[0], y=[0],
        mode='markers',
        marker=dict(size=10, color='red'),
        name='Origin (0,0)',
        hoverinfo='skip'
    ))

    # Add previously selected coordinates
    if st.session_state['selected_coords']:
        xs = [p[0] for p in st.session_state['selected_coords']]
        ys = [p[1] for p in st.session_state['selected_coords']]
        fig.add_trace(go.Scatter(
            x=xs,
            y=ys,
            mode='markers',
            marker=dict(color='green', size=8, symbol='x'),
            name='Selected Points',
            hoverinfo='skip'
        ))

    # Update layout - DISABLE all zoom/pan interactions
    fig.update_xaxes(
        range=[-1.2, 1.2],
        zeroline=False,
        title_text="X",
        fixedrange=True  # Disable zoom/pan on X axis
    )
    fig.update_yaxes(
        range=[-1.2, 1.2],
        zeroline=False,
        title_text="Y",
        scaleanchor="x",
        scaleratio=1,
        fixedrange=True  # Disable zoom/pan on Y axis
    )
    fig.update_layout(
        width=700,
        height=700,
        title="Click on the Tonefield to Select a Point",
        showlegend=True,
        plot_bgcolor='white',
        margin=dict(l=40, r=40, t=60, b=40),
        dragmode=False,  # Disable drag-to-zoom
        hovermode=False  # Disable hover interactions
    )

    # Display info message
    st.info("👆 Click anywhere on the plot to select coordinates")

    # Render plot and capture click events with config
    clicks = plotly_events(
        fig,
        click_event=True,
        hover_event=False,
        select_event=False,
        key="tonefield_plot",
        override_height=700,
        override_width=700
    )

    # DEBUG: Show raw click data with multiple formats
    st.write("**DEBUG - Raw click data (length):**", len(clicks))
    st.write("**DEBUG - Raw click data (str):**", str(clicks))
    st.json(clicks)  # JSON format shows structure better

    # Handle click event
    if clicks and len(clicks) > 0:
        st.write("**DEBUG - clicks[0] type:**", type(clicks[0]))
        st.write("**DEBUG - clicks[0] keys:**", list(clicks[0].keys()) if isinstance(clicks[0], dict) else "Not a dict")
        st.write("**DEBUG - clicks[0] full:**", str(clicks[0]))

        # Try to extract coordinates
        try:
            if isinstance(clicks[0], dict):
                st.write("**DEBUG - All click data:**")
                for key, value in clicks[0].items():
                    st.write(f"  - {key}: {value}")

                if 'x' in clicks[0] and 'y' in clicks[0]:
                    x_c = float(clicks[0]["x"])
                    y_c = float(clicks[0]["y"])
                    st.write(f"**DEBUG - Extracted coordinates:** x={x_c}, y={y_c}")

                    # Add to selected coordinates
                    new_coord = (round(x_c, 3), round(y_c, 3))
                    if new_coord not in st.session_state['selected_coords']:
                        st.session_state['selected_coords'].append(new_coord)
                        st.success(f"✅ Added: ({new_coord[0]}, {new_coord[1]})")
                        st.rerun()
                else:
                    st.warning(f"⚠️ Click data missing 'x' or 'y' keys. Available keys: {list(clicks[0].keys())}")
            else:
                st.error(f"❌ clicks[0] is not a dict, it's a {type(clicks[0])}")
        except Exception as e:
            st.error(f"❌ Error processing click: {str(e)}")
            import traceback
            st.code(traceback.format_exc())

    # Display selected coordinates
    if st.session_state['selected_coords']:
        st.markdown("### 📋 Selected Coordinates")
        for i, (x, y) in enumerate(st.session_state['selected_coords'], 1):
            st.write(f"{i}. ({x:.3f}, {y:.3f})")

    # Manual coordinate input (optional)
    st.markdown("---")
    with st.expander("⌨️ Manual Coordinate Input (Optional)"):
        col1, col2, col3 = st.columns([1, 1, 1])

        with col1:
            x_coord = st.number_input("X coordinate", min_value=-1.0, max_value=1.0, value=0.0, step=0.01, format="%.3f")

        with col2:
            y_coord = st.number_input("Y coordinate", min_value=-1.0, max_value=1.0, value=0.0, step=0.01, format="%.3f")

        with col3:
            st.write("")  # Spacing
            st.write("")  # Spacing
            if st.button("➕ Add Point", use_container_width=True):
                if 'selected_coords' not in st.session_state:
                    st.session_state['selected_coords'] = []
                st.session_state['selected_coords'].append((x_coord, y_coord))
                st.rerun()

    # Display selected coordinates
    if 'selected_coords' in st.session_state and st.session_state['selected_coords']:
        st.markdown("### 📋 Selected Coordinates")

        coords_text = ""
        for i, (x, y) in enumerate(st.session_state['selected_coords'], 1):
            coords_text += f"{i}. ({x:.3f}, {y:.3f})\n"

        st.text_area("Coordinates List", coords_text, height=150)

        col1, col2 = st.columns(2)
        with col1:
            if st.button("📋 Copy to Clipboard", use_container_width=True):
                st.code(coords_text, language=None)
                st.info("👆 Click the copy icon above to copy coordinates")

        with col2:
            if st.button("🗑️ Clear All", use_container_width=True):
                st.session_state['selected_coords'] = []
                st.rerun()

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

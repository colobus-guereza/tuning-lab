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

    # Create interactive Plotly coordinate system
    fig = go.Figure()

    # Add tonefield ellipse (using Scatter with fill for plotly_events compatibility)
    a = 0.60  # short axis (S direction)
    b = 0.85  # long axis (L direction)

    # Generate ellipse points
    theta = np.linspace(0, 2*np.pi, 200)
    ellipse_x = a * np.cos(theta)
    ellipse_y = b * np.sin(theta)

    # Add ellipse as filled scatter trace
    fig.add_trace(go.Scatter(
        x=ellipse_x,
        y=ellipse_y,
        fill='toself',
        fillcolor='rgba(173, 216, 230, 0.5)',
        line=dict(color='black', width=3),
        mode='lines',
        name='Tonefield',
        showlegend=True,
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
    fig.add_shape(type="line", x0=-1, y0=0, x1=1, y1=0,
                  line=dict(color="black", width=2))
    fig.add_shape(type="line", x0=0, y0=-1, x1=0, y1=1,
                  line=dict(color="black", width=2))

    # Add origin marker
    fig.add_trace(go.Scatter(
        x=[0], y=[0],
        mode='markers',
        marker=dict(size=12, color='red', symbol='circle'),
        name='Origin (0,0)',
        hovertemplate='Origin: (0, 0)<extra></extra>'
    ))

    # Add selected coordinates if any
    if 'selected_coords' in st.session_state and st.session_state['selected_coords']:
        coords = st.session_state['selected_coords']
        x_vals = [c[0] for c in coords]
        y_vals = [c[1] for c in coords]

        fig.add_trace(go.Scatter(
            x=x_vals,
            y=y_vals,
            mode='markers+text',
            marker=dict(size=10, color='green', symbol='x'),
            text=[f"{i+1}" for i in range(len(coords))],
            textposition="top center",
            name='Selected Points',
            hovertemplate='Point %{text}: (%{x:.3f}, %{y:.3f})<extra></extra>'
        ))

    # Update layout - disable zoom on drag, enable click selection
    fig.update_layout(
        title=dict(
            text='Interactive Coordinate System: Click to Select Coordinates',
            font=dict(size=18, family='Arial Black')
        ),
        xaxis=dict(
            title='X',
            range=[-1.1, 1.1],
            scaleanchor="y",
            scaleratio=1,
            gridcolor='lightgray',
            gridwidth=1,
            zeroline=True,
            zerolinecolor='black',
            zerolinewidth=2
        ),
        yaxis=dict(
            title='Y',
            range=[-1.1, 1.1],
            gridcolor='lightgray',
            gridwidth=1,
            zeroline=True,
            zerolinecolor='black',
            zerolinewidth=2
        ),
        width=700,
        height=700,
        hovermode='closest',
        showlegend=True,
        plot_bgcolor='white',
        dragmode=False  # Disable drag to zoom
    )

    # Display interactive plot with click events
    st.info("👆 Click anywhere on the plot to select coordinates")

    selected_points = plotly_events(
        fig,
        click_event=True,
        hover_event=False,
        select_event=False,
        override_height=700,
        override_width=700
    )

    # Handle click event
    if selected_points:
        clicked_x = selected_points[0]['x']
        clicked_y = selected_points[0]['y']

        # Display clicked coordinate
        st.success(f"🎯 Clicked: ({clicked_x:.3f}, {clicked_y:.3f})")

        # Auto-add to selected coordinates
        if 'selected_coords' not in st.session_state:
            st.session_state['selected_coords'] = []

        # Add only if not duplicate
        new_coord = (round(clicked_x, 3), round(clicked_y, 3))
        if new_coord not in st.session_state['selected_coords']:
            st.session_state['selected_coords'].append(new_coord)
            st.rerun()

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

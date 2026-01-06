#!/bin/bash

# Script para cambiar entre diseño antiguo y nuevo

if [ "$1" == "apple" ]; then
    echo "🍎 Cambiando a diseño Apple/Fitia..."
    cp app/streamlit_app.py app/streamlit_app_backup.py
    cp app/streamlit_app_apple.py app/streamlit_app.py
    echo "✅ Diseño Apple activado. Ejecuta: streamlit run app/streamlit_app.py"
elif [ "$1" == "original" ]; then
    echo "🔄 Restaurando diseño original..."
    if [ -f "app/streamlit_app_backup.py" ]; then
        cp app/streamlit_app_backup.py app/streamlit_app.py
        echo "✅ Diseño original restaurado"
    else
        echo "❌ No se encontró backup del diseño original"
    fi
else
    echo "Uso: ./switch_design.sh [apple|original]"
    echo ""
    echo "  apple     - Activa el diseño estilo Apple/Fitia"
    echo "  original  - Restaura el diseño original"
fi

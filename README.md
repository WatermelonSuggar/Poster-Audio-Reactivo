# Poster-Audio-Reactivo

## Inspiración audiovisual

![image](https://github.com/WatermelonSuggar/Poster-Audio-Reactivo/blob/main/Referencias/Imagenes%20y%20documentacion%20visual/Referencias.png)

## Conceptualización

Mi parte favorita del desarrollo de productos digitales es la **conceptualización**: la infinitud de posibilidades visuales, estéticas y narrativas que impulsan las ganas de crear.
Sin embargo, a lo largo del camino creativo, _el artista debe renunciar a muchas cosas_: la idealización, las expectativas, los medios de representación posibles, la estética, el mensaje soñado, los colores, las siluetas y esa infinitud que lo motivó al principio. 

**Internet es una galería interminable de universos posibles**, estilos visuales que existen y coexisten, cada uno con sus propias reglas, su propio peso. Elegir uno solo ya es una renuncia. El concepto y el estilo visual como decisión creativa: diferentes estéticas, diferentes decisiones gráficas, un solo producto.

> La pieza deja de ser suya, de su cabeza, para transformarse en realidad y hacer parte del mundo.

**Esta pieza visual interactiva está pensada para eventos en vivo**, donde el control debe soltarse y el artista debe fijar reglas visuales previas para que el sistema pueda evolucionar por su cuenta: banners, cámaras, fondos, condiciones de luz. A partir de esas reglas, el sistema vive solo.

Técnicamente, es un experimento con **detección de movimiento mediante background subtraction y frame difference temporal**, mezclando captura de video en tiempo real con visuales audioreactivos en el fondo.

## Estética

Encuadra un poster cambiante que responde al movimiento y al sonido, bajo el mundo conceptual del álbum **Brat de Charli XCX** — para mí, una representación de libertad y riesgo.

Como pieza musical para el demo elegí [**"Girl, So Confusing ft. Lorde"**](https://www.youtube.com/watch?v=0q3K6FPzY18), porque representa muchos de los sentimientos por los que he transitado en la vida.

![imagen de estetica](https://github.com/WatermelonSuggar/Poster-Audio-Reactivo/blob/main/Referencias/Imagenes%20y%20documentacion%20visual/estetica.png)

### Filtros visuales explorados

| Filtro | Descripción |
|---|---|
| 🟩 **Alto contraste** | Verde y negro, estética terminal |
| ⬛ **Máscara binaria** | Blanco y negro puro |
| 🔲 **Dualidad entrelazada** | Dos canvas superpuestos en franjas |
| 🎨 **Duotone** | Azul y verde |
| 🕹️ **Pixel art** | Cromático, bloques de 8×8px |

---

## Diseño del algoritmo generativo

La **detección de movimiento** es el eje central de interacción entre el cuerpo del usuario, el audio y el sistema visual. El algoritmo traduce dos flujos de datos — video en tiempo real y análisis de audio — en cambios visuales dinámicos dentro de una interfaz fragmentada y un fondo generativo basado en flowfields.

> 💡 *El sistema no solo responde a la presencia del usuario, sino específicamente a la **variación activa** del movimiento y a las cualidades energéticas del sonido.*

---

<!-- SUGERENCIA DE DIAGRAMA 1 —————————————————————————————
     Diagrama de flujo horizontal con tres columnas:
     
     [ INPUTS ]          [ PROCESAMIENTO ]        [ OUTPUTS ]
     
     Cámara ──────────► Background subtraction ──► Máscara binaria
                       ► Frame difference       ──► % movimiento
                       ► Análisis de luminancia ──► Cambio de filtro
     
     Audio ───────────► FFT / Amplitud          ──► Flowfield (color, densidad)
                       ► Bandas de frecuencia   ──► Intensidad generativa
     
     Estilo sugerido: fondo negro, nodos en verde neón (#50FF64), 
     flechas blancas, tipografía monoespaciada. Consistente con la estética Brat.
————————————————————————————————————————————————————————————— -->

### Lógica central

El sistema combina dos procesos simultáneos:

**1. Detección de movimiento por diferencia temporal de frames**

La cámara captura una secuencia continua de imágenes. El sistema construye un fondo dinámico a partir de un buffer de frames recientes, luego compara el frame actual con ese promedio temporal para identificar diferencias significativas de luminancia. Cuando estas diferencias superan un umbral, los píxeles se clasifican como zonas de movimiento y se calcula un **porcentaje global** que funciona como variable de control.

**2. Análisis de audio en tiempo real**

El audio se analiza mediante amplitud general y espectro de frecuencias. No reemplaza la detección de movimiento — la complementa: mientras el movimiento define los cambios de estado visual, el audio modula la expresividad del fondo generativo.

> **Relación híbrida:** el cuerpo actúa como disparador y modulador visual; el audio aporta variación orgánica, ritmo e intensidad estética.

---

## Inputs

### 🎥 Input visual — interacción por movimiento

La cámara captura la escena en tiempo real. A partir de esa señal el sistema extrae:

| Variable | Descripción |
|---|---|
| Diferencia de luminancia por píxel | Base del cálculo de movimiento |
| Máscara binaria de movimiento | Zonas activas vs. estáticas |
| Porcentaje global de movimiento | Variable de control principal |
| Estado de movimiento | `leve` / `moderado` / `activo` |

Estas variables controlan la reorganización de la interfaz, la transición entre filtros y el ritmo de cambio de los efectos.

---

### 🔊 Input sonoro — análisis de audio

El audio se analiza en tiempo real mediante amplitud y FFT:

| Variable | Descripción | Uso técnico |
|---|---|---|
| **Amplitud** | Volumen general en cada momento | `amp.getLevel()` |
| **FFT** | Distribución de energía en el espectro | `fft.analyze()` |
| **Graves** | Energía en frecuencias bajas (~20–250 Hz) | `fft.getEnergy("bass")` |
| Medios *(opcional)* | Frecuencias medias | `fft.getEnergy("mid")` |
| Agudos *(opcional)* | Frecuencias altas | `fft.getEnergy("treble")` |
| Waveform *(opcional)* | Forma de onda cruda | `fft.waveform()` |

> Estas variables modulan el flowfield en densidad, torsión, velocidad, color y grosor.

---

## Outputs visuales

<!-- SUGERENCIA DE DIAGRAMA 2 —————————————————————————————
     Mockup en dos capas apiladas (como layers en Figma/Photoshop):
     
     CAPA SUPERIOR: Interfaz de video fragmentado
     ┌─────────────────────────┐
     │   VIDEO PRINCIPAL       │  ← recuadro grande, filtro activo
     ├──────┬──────┬──────┬────┤
     │ frag │ frag │ frag │frag│  ← fragmentos inferiores
     └──────┴──────┴──────┴────┘
     
     CAPA INFERIOR: Fondo flowfield
     ░░░░░░░░░░░░░░░░░░░░░░░░░░  ← líneas fluidas, reactivas al audio
     
     Mostrar ambas capas por separado y luego compuestas.
     Fondo negro, líneas verdes, mismo estilo que el diagrama 1.
————————————————————————————————————————————————————————————— -->

### Capa 1 — Interfaz de video fragmentado

Composición de un recuadro principal con la captura de video y fragmentos inferiores con recortes de esa misma imagen. Los estilos visuales cambian automáticamente según el porcentaje de movimiento detectado y una lógica temporal de transición.

### Capa 2 — Fondo generativo (flowfield)

Sistema de líneas guiadas por un campo vectorial orgánico, construido con ruido de Perlin y modulado por los parámetros sonoros. Parámetros reactivos:

| Parámetro | Controlado por |
|---|---|
| Dirección y curvatura | Ruido de Perlin + tiempo |
| Densidad de líneas | Amplitud general |
| Longitud | Energía de graves |
| Grosor | Amplitud |
| Color (gamas verdes) | FFT / bandas de frecuencia |

> El fondo no es decorativo — es una capa reactiva que traduce la energía sonora en comportamiento visual continuo.

---

## Síntesis conceptual

<!-- SUGERENCIA DE DIAGRAMA 3 —————————————————————————————
     Diagrama circular / de dos fuerzas:
     
     Dos círculos que se intersectan (Venn diagram estilizado):
     
     Círculo izquierdo:  MOVIMIENTO CORPORAL
                         → detonante de cambio
                         → reorganización
                         → transición de estilos
     
     Círculo derecho:    AUDIO
                         → modulación del entorno
                         → ritmo
                         → energía espectral
     
     Intersección:       INTERFAZ AUDIOVISUAL
                         dinámica · sensible · expresiva
     
     Mismo estilo visual que los diagramas anteriores.
————————————————————————————————————————————————————————————— -->

El algoritmo transforma dos tipos de información en imagen:

- **El movimiento** actúa como detonante — cambia, reorganiza y hace transitar los estilos visuales.
- **El audio** actúa como fuerza moduladora — da ritmo, densidad y expresividad al entorno generativo.

Esta combinación genera una interfaz audiovisual que responde tanto a la presencia activa del usuario como a la estructura rítmica y espectral de la canción.


## Video demo

Ver video [aquí](https://youtube.com/shorts/BnpSudKzlI0?feature=share)

![FiltersImage](https://github.com/WatermelonSuggar/Poster-Audio-Reactivo/blob/main/Referencias/Imagenes%20y%20documentacion%20visual/filtros%20finales.png)

[Código](https://editor.p5js.org/WatermelonSuggar/sketches/VDUSejWh-)

## Documentación visual

[Figma](https://www.figma.com/board/3ceYYmM0cslk64UeChExjh/Visi%C3%B3n-artificial?node-id=0-1&t=9DcwaqnPkV0rq1hO-1)






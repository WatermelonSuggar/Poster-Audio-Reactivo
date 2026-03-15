# Poster-Audio-Reactivo

## Inspiración audiovisual

![image](https://github.com/WatermelonSuggar/Poster-Audio-Reactivo/blob/main/Referencias/Imagenes%20y%20documentacion%20visual/Referencias.png)

## Conceptualización

- Mi parte favorita del desarrollo de productos digitales es la conceptualización: la infinitud de posibilidades visuales, estéticas y narrativas que impulsan las ganas de crear.
Sin embargo, a lo largo del camino creativo, el artista debe renunciar a muchas cosas: la idealización, las expectativas, los medios de representación posibles, la estética, el mensaje soñado, los colores, las siluetas y esa infinitud que lo motivó al principio. Internet es una galería interminable de universos posibles, estilos visuales que existen y coexisten, cada uno con sus propias reglas, su propio peso. Elegir uno solo ya es una renuncia. El concepto y el estilo visual como decisión creativa: diferentes estéticas, diferentes decisiones gráficas, un solo producto.

La pieza deja de ser suya, de su cabeza, para transformarse en realidad y hacer parte del mundo.
Esta pieza está pensada para eventos en vivo, donde el control debe soltarse y el artista debe fijar reglas visuales previas para que el sistema pueda evolucionar por su cuenta: banners, cámaras, fondos, condiciones de luz. A partir de esas reglas, el sistema vive solo.
Técnicamente, es un experimento con detección de movimiento mediante background subtraction y frame difference temporal, mezclando captura de video en tiempo real con visuales audioreactivos en el fondo.

### Estética
Encuadra un poster cambiante que responde al movimiento y al sonido. Bajo el mundo conceptual del álbum** Brat de Charlie XCX** que para mí representa libertad y riesgo. Como pieza musical para el demo elegí [**"Girl so confusing ft Lorde"**](https://www.youtube.com/watch?v=0q3K6FPzY18&list=RD0q3K6FPzY18&start_radio=1) porque basicamente representa muchos de los sentimientos por los que he transitado en la vida.

El poster a su vez explora visualmente cuatro tipos de filtos: 
- pixel art
- duotone (azul y verde)
- máscara binaria (blanco y negro)
- dualidad entrelazada (dos canvas superpuestos por pequeñas franjas)
- filtro de alto contraste (verde y negro)

![imagen de estetica](https://github.com/WatermelonSuggar/Poster-Audio-Reactivo/blob/main/Referencias/Imagenes%20y%20documentacion%20visual/estetica.png)

## Diseño de algoritmo generativo/detección de movimiento

* En este proyecto, la **detección de movimiento** se convierte en el eje central de interacción entre el cuerpo del usuario, el audio y el sistema visual generativo. La lógica del algoritmo parte de la** captura de video en tiempo real y del análisis del audio de una canción**, para traducir ambos flujos de datos en cambios visuales dinámicos dentro de una interfaz fragmentada y un fondo generativo basado en **flowfields**. De esta manera, el sistema no solo responde a la presencia del usuario, sino específicamente a la variación activa del movimiento y a las cualidades energéticas del sonido.

### Lógica central que genera los cambios, visuales e interacción

La lógica central del sistema se basa en una combinación de dos procesos: detección de movimiento por diferencia temporal de frames y análisis del audio en tiempo real. En primer lugar, la cámara captura una secuencia continua de imágenes y el sistema construye un fondo dinámico a partir de un buffer de varios frames recientes. Luego compara el frame actual con ese promedio temporal para identificar diferencias significativas de luminancia. Cuando estas diferencias superan un umbral, los píxeles son clasificados como zonas de movimiento. A partir de allí se calcula un porcentaje global de movimiento, que funciona como variable de control para activar transiciones visuales, reorganizar fragmentos de imagen y alternar entre distintos estilos de representación.

En paralelo, el audio de la canción se analiza mediante amplitud general y espectro de frecuencias. Estos datos no reemplazan la detección de movimiento, sino que complementan la experiencia generativa: mientras el movimiento corporal define los cambios de estado y la activación de efectos visuales, el audio modula la expresividad del fondo generativo, especialmente el comportamiento del flowfield, el color y la intensidad de las líneas.

> En consecuencia, la interacción se estructura como una **relación híbrida:** el cuerpo del usuario actúa como disparador y modulador visual, mientras que el audio aporta variación orgánica, ritmo e intensidad estética.

### Inputs

**1. Input visual: interacción por movimiento**

- El principal input interactivo del sistema es la imagen capturada por la cámara en tiempo real. A partir de esta señal visual, el sistema extrae información relacionada con el cambio entre frames consecutivos y el fondo temporal promedio. Este procesamiento permite detectar movimiento activo en la escena, no solo presencia estática.

**Las variables derivadas de este input son:**

- diferencia de luminancia por píxel

- máscara binaria de movimiento

- porcentaje global de movimiento en pantalla

- estado de movimiento, por ejemplo leve o moderado

Estas variables controlan directamente la reorganización de la interfaz visual, la transición entre filtros y el ritmo de cambio de los efectos.

**2. Input sonoro: análisis de audio**

- El segundo input del sistema es el audio de una canción cargada dentro del proyecto. Este audio se analiza en tiempo real mediante herramientas de amplitud y FFT.

**Las variables utilizadas son:**

- Amplitud
Representa el volumen general de la canción en un momento dado.
Uso técnico: amp.getLevel()

- FFT
Permite analizar la distribución de energía en distintas frecuencias del espectro sonoro.
Uso técnico: fft.analyze()

- Banda de graves
Corresponde a la energía de las frecuencias bajas, aproximadamente entre 20 y 250 Hz.
Uso técnico: fft.getEnergy("bass")

Opcionalmente, el sistema también puede usar:

medios: fft.getEnergy("mid")

agudos: fft.getEnergy("treble")

waveform: fft.waveform()

> Estas variables modulan el fondo generativo, haciendo que el flowfield cambie en densidad, torsión, velocidad, color o grosor según la estructura sonora de la canción.

### Outputs visuales

Los outputs visuales del sistema se dividen en dos capas principales.

**1. Interfaz de video fragmentado**

La primera capa consiste en una composición visual formada por un recuadro principal que muestra la captura de video y varios fragmentos inferiores que presentan recortes de esa misma imagen. Sobre esta base se aplican distintos estilos visuales que cambian automáticamente según la detección de movimiento.

Entre los outputs visuales de esta capa se encuentran:

- imagen de alto contraste monocromática

- interlace monocromático de alto contraste

- máscara binaria

- pixelart cromático

- duotone

> El cambio entre estos estilos no es aleatorio, sino que responde al porcentaje de movimiento detectado y a una lógica temporal de transición.

**2. Fondo generativo basado en flowfield**

La segunda capa corresponde al fondo generativo. Este sistema utiliza líneas guiadas por un campo vectorial orgánico, construido a partir de ruido y modulado por parámetros sonoros. El resultado es un campo de líneas fluidas que cambia con la música y que funciona como atmósfera visual envolvente detrás de la interfaz principal.

Los outputs visuales del flowfield pueden variar en:

- dirección y curvatura

- densidad

- longitud de línea

- grosor

- intensidad

- color, por ejemplo alternancias gamas verdes

> De este modo, el fondo no es decorativo, sino una capa reactiva que traduce la energía sonora en comportamiento visual continuo.

## Síntesis conceptual del algoritmo

En síntesis, el algoritmo generativo del proyecto transforma dos tipos de información en imagen: **el movimiento corporal y el sonido.** El movimiento actúa como detonante de cambio, reorganización y transición de estilos, mientras que el audio actúa como fuerza moduladora del entorno generativo. Esta combinación permite que la experiencia visual responda tanto a la presencia activa del usuario como a la estructura rítmica y espectral de la canción, generando una interfaz audiovisual dinámica, sensible y expresiva.

## Video demo

Ver video [aquí](https://youtube.com/shorts/BnpSudKzlI0?feature=share)

![FiltersImage](https://github.com/WatermelonSuggar/Poster-Audio-Reactivo/blob/main/Referencias/Imagenes%20y%20documentacion%20visual/filtros%20finales.png)

[Código](https://editor.p5js.org/WatermelonSuggar/sketches/VDUSejWh-)

## Documentación visual

[Figma](https://www.figma.com/board/3ceYYmM0cslk64UeChExjh/Visi%C3%B3n-artificial?node-id=0-1&t=9DcwaqnPkV0rq1hO-1)






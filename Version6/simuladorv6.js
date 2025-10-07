// -- constantes y estado global --

// define el tamaño total de la memoria en 16 megabytes.
const MEMORIA_TOTAL = 16 * 1024 * 1024;
// define un valor para ayudar a dibujar la barra de memoria a una escala visible.
const ESCALA_GRAFICA = 64 * 1024;
// un arreglo que guardará los bloques de memoria y su estado.
let memoria = [];
// un contador para dar un número único a cada programa que se agrega.
let contador_pid = 1;

// un objeto que guarda los programas predefinidos con su nombre y tamaño.
// puede crecer si el usuario añade más programas.
const programas = {
    so: { nombre: "Sistema Operativo", tamano: 2 * 1024 * 1024 },
    notepad: { nombre: "NotePad", tamano: 1 * 1024 * 1024 },
    word: { nombre: "Word", tamano: 4 * 1024 * 1024 },
    excel: { nombre: "Excel", tamano: 3 * 1024 * 1024 },
    vscode: { nombre: "VSCode", tamano: 5 * 1024 * 1024 },
    paint: { nombre: "Paint", tamano: 512 * 1024 }
};

// -- inicialización --

// esto se ejecuta una vez que toda la página html ha cargado.
document.addEventListener("DOMContentLoaded", () => {
    // llena el menú desplegable con los programas iniciales.
    actualizar_selector_programas();

    // se asegura de que si el usuario cambia el método (ej. de fijo a dinámico), la memoria se reinicie.
    document.querySelectorAll("input[name='metodo']").forEach(radio => {
        radio.addEventListener("change", reiniciar_memoria);
    });

    // prepara la memoria por primera vez cuando la página carga.
    reiniciar_memoria();
});

// -- función para agregar programas personalizados --
function agregar_programa_personalizado() {
    // toma los elementos del html donde el usuario escribe el nombre y el tamaño.
    const nombre_input = document.getElementById("nombre_personalizado");
    const tamano_input = document.getElementById("tamano_personalizado");

    // lee el nombre y el tamaño que el usuario escribió.
    const nombre = nombre_input.value.trim();
    const tamano_mib = parseFloat(tamano_input.value);

    // revisa si el usuario de verdad escribió un nombre.
    if (!nombre) {
        alert("Por favor, introduce un nombre para el programa.");
        return; // detiene la función si no hay nombre.
    }
    // revisa si el tamaño es un número válido y mayor que cero.
    if (isNaN(tamano_mib) || tamano_mib <= 0) {
        alert("Por favor, introduce un tamaño válido en MiB (mayor que 0).");
        return; // detiene la función si el tamaño no es válido.
    }

    // crea una clave única para el nuevo programa para que no se repita.
    const clave = nombre.toLowerCase().replace(/\s/g, '') + Date.now();
    // añade el nuevo programa a la lista de programas.
    programas[clave] = {
        nombre: nombre,
        tamano: tamano_mib * 1024 * 1024 // convierte el tamaño de mib a bytes.
    };
    // actualiza el menú desplegable para que aparezca el nuevo programa.
    actualizar_selector_programas();
    
    // limpia los campos de texto para que el usuario pueda añadir otro programa.
    nombre_input.value = "";
    tamano_input.value = "";
    // selecciona automáticamente el programa que se acaba de crear.
    document.getElementById("programaSelect").value = clave;
}

// -- funciones de utilidad (helpers) --

// esta función actualiza el menú desplegable de los programas.
function actualizar_selector_programas() {
    const selector = document.getElementById("programaSelect");
    const programa_seleccionado_previamente = selector.value;
    selector.innerHTML = ""; // limpia el menú antes de llenarlo de nuevo.
    
    // recorre la lista de programas y crea una opción en el menú para cada uno.
    Object.keys(programas).forEach(clave => {
        const opcion = document.createElement("option");
        opcion.value = clave;
        const programa = programas[clave];
        opcion.textContent = `${programa.nombre} (${formatear_tamano(programa.tamano)})`;
        selector.appendChild(opcion);
    });
    // intenta mantener seleccionado el programa que estaba antes de actualizar.
    if (programa_seleccionado_previamente) {
        selector.value = programa_seleccionado_previamente;
    }
}

// convierte un tamaño en bytes a un formato más legible (mib o kib).
function formatear_tamano(tamano_en_bytes) {
    if (tamano_en_bytes >= 1024 * 1024) {
        return (tamano_en_bytes / (1024 * 1024)).toFixed(2) + " MiB";
    }
    return (tamano_en_bytes / 1024).toFixed(0) + " KiB";
}

// convierte un número a su representación en hexadecimal.
function a_hex(numero) {
    return `0x${numero.toString(16).toUpperCase().padStart(6, '0')}`;
}


// -- funciones de renderizado (dibujar en pantalla) --

// función principal para actualizar toda la parte visual.
function actualizar_ui() {
    dibujar_barra_memoria();
    dibujar_tabla_particiones();
}

// dibuja la barra de colores que representa la memoria.
function dibujar_barra_memoria() {
    const contenedor = document.getElementById("memoria");
    contenedor.innerHTML = ""; // limpia la barra antes de volver a dibujarla.
    
    // recorre cada bloque de memoria.
    memoria.forEach(bloque => {
        const div_bloque = document.createElement("div");
        // calcula qué tan ancho debe ser el bloque en la barra.
        const flexibilidad = Math.max(bloque.tamano / ESCALA_GRAFICA, 0.2);
        div_bloque.style.flex = flexibilidad;
        // le pone color verde si está libre, o rojo si está ocupado.
        div_bloque.className = bloque.libre ? "bg-green-500" : "bg-red-500";
        div_bloque.className += " border-r-2 border-gray-800 text-white text-xs font-semibold text-center overflow-hidden p-1 flex items-center justify-center";
        div_bloque.style.whiteSpace = "pre-line";
        
        // escribe el texto dentro del bloque.
        if (bloque.libre) {
            div_bloque.innerText = `Libre\n${formatear_tamano(bloque.tamano)}`;
        } else {
            div_bloque.innerText = `${bloque.pid}\n(${formatear_tamano(bloque.tamano_proceso || bloque.tamano)})`;
        }
        contenedor.appendChild(div_bloque);
    });
}

// dibuja la tabla que muestra los detalles de cada bloque de memoria.
function dibujar_tabla_particiones() {
    const cuerpo_tabla = document.querySelector("#tabla_particiones tbody");
    cuerpo_tabla.innerHTML = ""; // limpia la tabla antes de volver a dibujarla.
    const metodo_actual = document.querySelector("input[name='metodo']:checked").value;

    // recorre cada bloque de memoria y crea una fila en la tabla.
    memoria.forEach((bloque, indice) => {
        const fila = document.createElement("tr");
        let frag_interna = "N/A";
        // calcula la fragmentación interna si el método es estático y el bloque está ocupado.
        if ((metodo_actual === "fijo" || metodo_actual === "variable") && !bloque.libre) {
            frag_interna = formatear_tamano(bloque.tamano - bloque.tamano_proceso);
        }
        // llena la fila con toda la información del bloque.
        fila.innerHTML = `
      <td class="px-4 py-3 text-sm">${indice + 1}</td>
      <td class="px-4 py-3 text-sm">${bloque.libre ? "---" : bloque.pid}</td>
      <td class="px-4 py-3 text-sm">${bloque.libre ? '<span class="font-medium text-green-700">Libre</span>' : '<span class="font-medium text-red-700">Ocupado</span>'}</td>
      <td class="px-4 py-3 text-sm">${bloque.inicio}</td>
      <td class="px-4 py-3 text-sm font-mono">${a_hex(bloque.inicio)}</td>
      <td class="px-4 py-3 text-sm">${formatear_tamano(bloque.tamano)}</td>
      <td class="px-4 py-3 text-sm">${frag_interna}</td>
    `;
        cuerpo_tabla.appendChild(fila);
    });
}

// -- lógica principal de gestión de memoria --

// se llama para reiniciar la simulación a su estado inicial.
function reiniciar_memoria() {
    contador_pid = 1; // reinicia el contador de programas.
    const metodo = document.querySelector("input[name='metodo']:checked").value;
    const contenedor_algoritmo = document.getElementById("contenedor_algoritmo");
    const selector_algoritmo = document.getElementById("algoritmo");
    const boton_compactar = document.getElementById("boton_compactar");

    // activa o desactiva el menú de algoritmos dependiendo del método elegido.
    if (metodo === 'fijo') {
        contenedor_algoritmo.classList.add("opacity-40");
        selector_algoritmo.disabled = true;
    } else {
        contenedor_algoritmo.classList.remove("opacity-40");
        selector_algoritmo.disabled = false;
    }

    // activa el botón de compactar solo si se elige el método de compactación.
    boton_compactar.disabled = (metodo !== "compactacion");

    // prepara la memoria según el método que el usuario seleccionó.
    if (metodo === "fijo") {
        memoria = [];
        let tamano_particion = 2 * 1024 * 1024;
        for (let i = 0; i < MEMORIA_TOTAL / tamano_particion; i++) {
            memoria.push({ inicio: i * tamano_particion, tamano: tamano_particion, libre: true });
        }
    } else if (metodo === "variable") {
        memoria = [];
        const tamanos = [1, 2, 3, 4, 6].map(m => m * 1024 * 1024);
        let inicio = 0;
        tamanos.forEach(t => {
            memoria.push({ inicio: inicio, tamano: t, libre: true });
            inicio += t;
        });
    } else { // para los métodos dinámicos, la memoria empieza como un solo bloque libre.
        memoria = [{ inicio: 0, tamano: MEMORIA_TOTAL, libre: true }];
    }
    actualizar_ui(); // actualiza la pantalla para mostrar el estado inicial.
}


// se llama cuando el usuario presiona el botón "agregar programa".
function agregar_programa() {
    const metodo = document.querySelector("input[name='metodo']:checked").value;
    const clave_programa = document.getElementById("programaSelect").value;
    if (!clave_programa) {
        alert("No hay programas para agregar. Por favor, cree uno personalizado.");
        return;
    }
    const programa = programas[clave_programa];
    const tamano_proceso = programa.tamano;
    const pid = `${programa.nombre}-${contador_pid++}`;

    // decide qué función de asignación llamar según el método elegido.
    if (metodo === "fijo" || metodo === "variable") {
        asignar_memoria_estatica(pid, tamano_proceso);
    } else if (metodo === "dinamico") {
        if (!intentar_asignar_dinamica(pid, tamano_proceso)) {
            alert(`No hay espacio suficiente para ${pid}.`);
        }
    } else if (metodo === "compactacion") {
        // primero intenta asignar sin compactar.
        if (!intentar_asignar_dinamica(pid, tamano_proceso)) {
            // si falla, compacta la memoria y vuelve a intentar.
            compactar_memoria();
            actualizar_ui();
            if (!intentar_asignar_dinamica(pid, tamano_proceso)) {
                alert(`No hay espacio suficiente para ${pid} incluso después de compactar.`);
            }
        }
    }
    actualizar_ui();
}

// se llama cuando el usuario quiere liberar un programa de la memoria.
function liberar_programa_por_pid() {
    const pid_a_liberar = document.getElementById("pid_a_liberar").value.trim();
    if (!pid_a_liberar) return;
    let encontrado = false;
    // busca en toda la memoria el programa con el pid que el usuario escribió.
    memoria.forEach(bloque => {
        if (bloque.pid === pid_a_liberar) {
            bloque.libre = true;
            delete bloque.pid;
            delete bloque.tamano_proceso;
            encontrado = true;
        }
    });
    // si lo encontró, fusiona los bloques libres y actualiza la pantalla.
    if (encontrado) {
        fusionar_bloques_libres();
        actualizar_ui();
    } else {
        alert(`Proceso con PID "${pid_a_liberar}" no encontrado.`);
    }
    document.getElementById("pid_a_liberar").value = "";
}

// busca si hay bloques libres juntos y los une para formar un bloque más grande.
function fusionar_bloques_libres() {
    for (let i = 0; i < memoria.length - 1; i++) {
        if (memoria[i].libre && memoria[i + 1].libre) {
            memoria[i].tamano += memoria[i + 1].tamano;
            memoria.splice(i + 1, 1);
            i--; // vuelve a revisar la posición actual por si hay más fusiones.
        }
    }
}

// mueve todos los bloques ocupados al principio de la memoria.
function compactar_memoria() {
    const bloques_ocupados = memoria.filter(b => !b.libre);
    const nueva_memoria = [];
    let inicio_actual = 0;

    // coloca los bloques ocupados uno después del otro.
    bloques_ocupados.forEach(bloque => {
        const nuevo_bloque = { ...bloque, inicio: inicio_actual };
        nueva_memoria.push(nuevo_bloque);
        inicio_actual += nuevo_bloque.tamano;
    });

    // el espacio que sobra se convierte en un único bloque libre al final.
    const tamano_libre_total = MEMORIA_TOTAL - inicio_actual;

    if (tamano_libre_total > 0) {
        nueva_memoria.push({
            inicio: inicio_actual,
            tamano: tamano_libre_total,
            libre: true
        });
    }
    memoria = nueva_memoria.length > 0 ? nueva_memoria : [{ inicio: 0, tamano: MEMORIA_TOTAL, libre: true }];
}

// se llama cuando el usuario presiona el botón de compactar.
function iniciar_compactacion() {
    compactar_memoria();
    actualizar_ui();
}

// -- lógica de asignación --

// asigna un programa en los modos de particiones estáticas.
function asignar_memoria_estatica(pid, tamano_proceso) {
    const algoritmo = document.getElementById("algoritmo").value;
    const particiones_disponibles = memoria.filter(b => b.libre && b.tamano >= tamano_proceso);

    if (particiones_disponibles.length === 0) {
        alert(`No hay una partición libre lo suficientemente grande para ${pid}.`);
        return;
    }

    let bloque_encontrado = null;

    // elige una partición según el algoritmo seleccionado (primer, mejor o peor ajuste).
    if (algoritmo === "primero") {
        bloque_encontrado = particiones_disponibles[0];
    } else if (algoritmo === "mejor") {
        particiones_disponibles.sort((a, b) => a.tamano - b.tamano);
        bloque_encontrado = particiones_disponibles[0];
    } else if (algoritmo === "peor") {
        particiones_disponibles.sort((a, b) => b.tamano - a.tamano);
        bloque_encontrado = particiones_disponibles[0];
    }

    // si encontró un bloque, lo marca como ocupado.
    if (bloque_encontrado) {
        bloque_encontrado.libre = false;
        bloque_encontrado.pid = pid;
        bloque_encontrado.tamano_proceso = tamano_proceso;
    } else {
        alert(`No se pudo asignar ${pid} con el algoritmo seleccionado.`);
    }
}

// asigna un programa en los modos de particiones dinámicas.
function intentar_asignar_dinamica(pid, tamano_proceso) {
    const algoritmo = document.getElementById("algoritmo").value;
    let bloque_candidato = null;
    const bloques_libres = memoria.filter(b => b.libre && b.tamano >= tamano_proceso);
    if (bloques_libres.length === 0) return false;

    // elige un bloque según el algoritmo seleccionado.
    if (algoritmo === "primero") {
        bloque_candidato = bloques_libres[0];
    } else if (algoritmo === "mejor") {
        bloque_candidato = bloques_libres.sort((a, b) => a.tamano - b.tamano)[0];
    } else if (algoritmo === "peor") {
        bloque_candidato = bloques_libres.sort((a, b) => b.tamano - a.tamano)[0];
    }

    if (!bloque_candidato) return false;

    const indice = memoria.indexOf(bloque_candidato);
    const tamano_restante = bloque_candidato.tamano - tamano_proceso;

    // crea el bloque ocupado con el tamaño exacto del programa.
    const bloque_ocupado = { inicio: bloque_candidato.inicio, tamano: tamano_proceso, libre: false, pid: pid };

    // si sobra espacio en el bloque original, crea un nuevo bloque libre con ese espacio.
    if (tamano_restante > 0) {
        const bloque_libre_nuevo = { inicio: bloque_candidato.inicio + tamano_proceso, tamano: tamano_restante, libre: true };
        memoria.splice(indice, 1, bloque_ocupado, bloque_libre_nuevo);
    } else {
        // si el tamaño es exacto, simplemente reemplaza el bloque.
        memoria.splice(indice, 1, bloque_ocupado);
    }
    return true;
}

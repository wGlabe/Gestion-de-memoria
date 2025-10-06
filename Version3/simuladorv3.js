// -- constantes y estado global --

const MEMORIA_TOTAL = 16 * 1024 * 1024; 
const ESCALA_GRAFICA = 64 * 1024; 
let memoria = [];
let contador_pid = 1;

const programas = {
  so:      { nombre: "Sistema Operativo", tamano: 2 * 1024 * 1024 },
  notepad: { nombre: "NotePad",           tamano: 1 * 1024 * 1024 },
  word:    { nombre: "Word",              tamano: 4 * 1024 * 1024 },
  excel:   { nombre: "Excel",             tamano: 3 * 1024 * 1024 },
  vscode:  { nombre: "VSCode",            tamano: 5 * 1024 * 1024 },
  paint:   { nombre: "Paint",             tamano: 512 * 1024 }
};

// -- inicialización --

document.addEventListener("DOMContentLoaded", () => {
  const selector = document.getElementById("programaSelect");
  selector.innerHTML = "";
  Object.keys(programas).forEach(clave => {
    const opcion = document.createElement("option");
    opcion.value = clave;
    const programa = programas[clave];
    opcion.textContent = `${programa.nombre} (${formatear_tamano(programa.tamano)})`;
    selector.appendChild(opcion);
  });

  document.querySelectorAll("input[name='metodo']").forEach(radio => {
    radio.addEventListener("change", reiniciar_memoria);
  });

  reiniciar_memoria();
});


// -- funciones de utilidad (helpers) --

function formatear_tamano(tamano_en_bytes) {
  if (tamano_en_bytes >= 1024 * 1024) {
    return (tamano_en_bytes / (1024 * 1024)).toFixed(2) + " MiB";
  }
  return (tamano_en_bytes / 1024).toFixed(0) + " KiB";
}

function a_hex(numero) {
    return `0x${numero.toString(16).toUpperCase().padStart(6, '0')}`;
}


// -- funciones de renderizado (dibujar en pantalla) --

function actualizar_ui() {
  dibujar_barra_memoria();
  dibujar_tabla_particiones();
}

function dibujar_barra_memoria() {
  const contenedor = document.getElementById("memoria");
  contenedor.innerHTML = "";

  memoria.forEach(bloque => {
    const div_bloque = document.createElement("div");
    
    const flexibilidad = Math.max(bloque.tamano / ESCALA_GRAFICA, 0.2);
    div_bloque.style.flex = flexibilidad;

    div_bloque.className = bloque.libre ? "bg-green-500" : "bg-red-500";
    div_bloque.className += " border-r-2 border-gray-800 text-white text-xs text-center overflow-hidden p-1 flex items-center justify-center";
    
    div_bloque.style.whiteSpace = "pre-line";
    if (bloque.libre) {
        div_bloque.innerText = `Libre\n${formatear_tamano(bloque.tamano)}`;
    } else {
        div_bloque.innerText = `${bloque.pid}\n(${formatear_tamano(bloque.tamano)})`;
    }
    
    contenedor.appendChild(div_bloque);
  });
}

function dibujar_tabla_particiones() {
  const cuerpo_tabla = document.querySelector("#tabla_particiones tbody");
  cuerpo_tabla.innerHTML = "";
  const metodo_actual = document.querySelector("input[name='metodo']:checked").value;

  memoria.forEach((bloque, indice) => {
    const fila = document.createElement("tr");
    
    let frag_interna = "N/A";
    if (metodo_actual !== "dinamico" && !bloque.libre) {
        frag_interna = formatear_tamano(bloque.tamano - bloque.tamano_proceso);
    }
    
    fila.innerHTML = `
      <td class="border px-4 py-2">${indice + 1}</td>
      <td class="border px-4 py-2">${bloque.libre ? "---" : bloque.pid}</td>
      <td class="border px-4 py-2">${bloque.libre ? "Libre" : "Ocupado"}</td>
      <td class="border px-4 py-2">${bloque.inicio}</td>
      <td class="border px-4 py-2">${a_hex(bloque.inicio)}</td>
      <td class="border px-4 py-2">${formatear_tamano(bloque.tamano)}</td>
      <td class="border px-4 py-2">${frag_interna}</td>
    `;
    cuerpo_tabla.appendChild(fila);
  });
}


// -- lógica principal de gestión de memoria --

function reiniciar_memoria() {
  contador_pid = 1;
  const metodo = document.querySelector("input[name='metodo']:checked").value;
  const contenedor_algoritmo = document.getElementById("contenedor_algoritmo");
  const selector_algoritmo = document.getElementById("algoritmo");

  if (metodo === "fijo") {
    memoria = [];
    let tamano_particion = 2 * 1024 * 1024;
    for (let i = 0; i < MEMORIA_TOTAL / tamano_particion; i++) {
      memoria.push({ inicio: i * tamano_particion, tamano: tamano_particion, libre: true, pid: null, tamano_proceso: 0 });
    }
    contenedor_algoritmo.classList.add("opacity-50");
    selector_algoritmo.disabled = true;
  } else if (metodo === "variable") {
    memoria = [];
    const tamanos = [1, 2, 3, 4, 6].map(m => m * 1024 * 1024);
    let inicio = 0;
    tamanos.forEach(t => {
      memoria.push({ inicio: inicio, tamano: t, libre: true, pid: null, tamano_proceso: 0 });
      inicio += t;
    });
    contenedor_algoritmo.classList.add("opacity-50");
    selector_algoritmo.disabled = true;
  } else if (metodo === "dinamico") {
    // en dinámico, empezamos con un solo bloque grande de memoria libre.
    memoria = [{ inicio: 0, tamano: MEMORIA_TOTAL, libre: true, pid: null }];
    contenedor_algoritmo.classList.remove("opacity-50");
    selector_algoritmo.disabled = false;
  }
  actualizar_ui();
}

function agregar_programa() {
  const metodo = document.querySelector("input[name='metodo']:checked").value;
  const clave_programa = document.getElementById("programaSelect").value;
  const programa = programas[clave_programa];
  const tamano_proceso = programa.tamano;
  const pid = `${programa.nombre}-${contador_pid++}`;
  
  if (metodo === "fijo" || metodo === "variable") {
    asignar_memoria_estatica(pid, tamano_proceso);
  } else if (metodo === "dinamico") {
    asignar_memoria_dinamica(pid, tamano_proceso);
  }
  
  actualizar_ui();
}

function liberar_programa_por_pid() {
    const pid_a_liberar = document.getElementById("pid_a_liberar").value;
    if (!pid_a_liberar) return;

    let encontrado = false;
    memoria.forEach(bloque => {
        if (bloque.pid === pid_a_liberar) {
            bloque.libre = true;
            delete bloque.pid;
            encontrado = true;
        }
    });

    if (encontrado) {
        fusionar_bloques_libres();
        actualizar_ui();
    } else {
        alert(`Proceso con PID "${pid_a_liberar}" no encontrado.`);
    }
    document.getElementById("pid_a_liberar").value = "";
}

function fusionar_bloques_libres() {
    for (let i = 0; i < memoria.length - 1; i++) {
        if (memoria[i].libre && memoria[i+1].libre) {
            memoria[i].tamano += memoria[i+1].tamano;
            memoria.splice(i + 1, 1);
            i--; // después de fusionar, nos quedamos en el mismo índice para ver si se puede fusionar con el siguiente.
        }
    }
}

function asignar_memoria_estatica(pid, tamano_proceso) {
  const bloque_encontrado = memoria.find(b => b.libre && b.tamano >= tamano_proceso);

  if (bloque_encontrado) {
    bloque_encontrado.libre = false;
    bloque_encontrado.pid = pid;
    bloque_encontrado.tamano_proceso = tamano_proceso;
  } else {
    alert(`No hay una partición libre lo suficientemente grande para ${pid}.`);
  }
}

function asignar_memoria_dinamica(pid, tamano_proceso) {
    const algoritmo = document.getElementById("algoritmo").value;
    let bloque_candidato = null;

    const bloques_libres_suficientes = memoria.filter(b => b.libre && b.tamano >= tamano_proceso);

    if (bloques_libres_suficientes.length === 0) {
        alert(`No hay espacio suficiente para ${pid}.`);
        return;
    }

    if (algoritmo === "primero") {
        bloque_candidato = bloques_libres_suficientes[0];
    } else if (algoritmo === "mejor") {
        bloque_candidato = bloques_libres_suficientes.sort((a, b) => a.tamano - b.tamano)[0];
    } else if (algoritmo === "peor") {
        bloque_candidato = bloques_libres_suficientes.sort((a, b) => b.tamano - a.tamano)[0];
    }

    if (!bloque_candidato) return;

    const indice = memoria.indexOf(bloque_candidato);
    const tamano_restante = bloque_candidato.tamano - tamano_proceso;

    // si el espacio restante es muy pequeño, se lo asignamos todo para evitar micro-fragmentos.
    // por ahora, simplemente dividimos si sobra algo.
    if (tamano_restante > 0) {
        const bloque_ocupado = {
            inicio: bloque_candidato.inicio,
            tamano: tamano_proceso,
            libre: false,
            pid: pid
        };
        const bloque_libre_nuevo = {
            inicio: bloque_candidato.inicio + tamano_proceso,
            tamano: tamano_restante,
            libre: true
        };
        memoria.splice(indice, 1, bloque_ocupado, bloque_libre_nuevo);
    } else { // ajuste exacto
        bloque_candidato.libre = false;
        bloque_candidato.pid = pid;
    }
}

// -- hacemos algunas funciones accesibles globalmente desde el html --
window.agregar_programa = agregar_programa;
window.reiniciar_memoria = reiniciar_memoria;
window.liberar_programa_por_pid = liberar_programa_por_pid;

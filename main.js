/* =====================================================
   ANUARIO ESCOLAR - 30 PAGINAS
   Guardado automático, fotografías y firmas
===================================================== */

const TOTAL_PAGES = 30;
const TURN_DURATION = 720;

const DB_NAME = "AnuarioEugenioFerroFalla";
const STORE_NAME = "records";

const book = document.getElementById("book");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const pageCounter = document.getElementById("pageCounter");
const progressBar = document.getElementById("progressBar");

const editModeButton = document.getElementById("editModeButton");
const resetButton = document.getElementById("resetButton");

const helpButton = document.getElementById("helpButton");
const helpDialog = document.getElementById("helpDialog");
const closeHelp = document.getElementById("closeHelp");

const saveBookButton = document.getElementById("saveBookButton");
const loadBookButton = document.getElementById("loadBookButton");
const loadBookInput = document.getElementById("loadBookInput");
const saveStatus = document.getElementById("saveStatus");

let currentPage = 1;
let isAnimating = false;
let editMode = false;
let database;
let saveQueue = Promise.resolve();

const defaultProfile = {
    name: "Escribe tu nombre",
    phrase: "Nunca dejes de soñar.",
    memory: "Mi recuerdo favorito del colegio...",
    aspirations: [
        "Terminar mis estudios",
        "Cumplir mis sueños",
        "Ayudar a mi familia",
        "Conocer nuevos lugares",
        "Ser una gran persona"
    ],
    thanks: "Gracias a mi familia, profesores y amigos."
};


/* ============================================
   BASE DE DATOS DEL NAVEGADOR
============================================ */

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = () => {
            const db = request.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {
                    keyPath: "key"
                });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function dbGet(key) {
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
            STORE_NAME,
            "readonly"
        );

        const request = transaction.objectStore(STORE_NAME).get(key);

        request.onsuccess = () => {
            resolve(request.result?.value ?? null);
        };

        request.onerror = () => reject(request.error);
    });
}

function dbSet(key, value) {
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
            STORE_NAME,
            "readwrite"
        );

        transaction.objectStore(STORE_NAME).put({
            key,
            value
        });

        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

function dbDelete(key) {
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
            STORE_NAME,
            "readwrite"
        );

        transaction.objectStore(STORE_NAME).delete(key);

        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
    });
}

function dbGetAll() {
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
            STORE_NAME,
            "readonly"
        );

        const request = transaction.objectStore(STORE_NAME).getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

function dbReplaceAll(records) {
    return new Promise((resolve, reject) => {
        const transaction = database.transaction(
            STORE_NAME,
            "readwrite"
        );

        const store = transaction.objectStore(STORE_NAME);

        store.clear();

        records.forEach(record => {
            store.put(record);
        });

        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
    });
}

function setStatus(message) {
    if (saveStatus) {
        saveStatus.textContent = message;
    }
}


/* ============================================
   FUNCIONES GENERALES
============================================ */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

async function getProfile(pageNumber) {
    const saved = await dbGet(
        `anuario-profile-${pageNumber}`
    );

    return saved
        ? { ...defaultProfile, ...saved }
        : { ...defaultProfile };
}

function editable(value, placeholder, className = "") {
    return `
        <div
            class="editable ${className}"
            contenteditable="true"
            spellcheck="true"
            data-placeholder="${escapeHTML(placeholder)}"
        >${escapeHTML(value)}</div>
    `;
}


/* ============================================
   CREAR PORTADA
============================================ */

async function createCover() {
    const year = await dbGet("anuario-cover-year") || "2026";

    return `
        <article class="book-page cover-page">

            <div class="cover-ribbon">
                PROMOCIÓN ESCOLAR
            </div>

            <div class="cover-crest">
                <img
                    src="escudo.png"
                    alt="Escudo institucional"
                    onerror="
                        this.remove();
                        this.parentElement.innerHTML =
                        '<span class=\\'crest-fallback\\'>✦</span>';
                    "
                >
            </div>

            <p class="cover-small">
                INSTITUCIÓN EDUCATIVA
            </p>

            <h2>
                Eugenio<br>
                <em>Ferro Falla</em>
            </h2>

            <div class="cover-rule"></div>

            <p class="cover-motto">
                Hoy estudiante, mañana gran sueño
            </p>

            <div class="cover-bottom">
                <span>RECUERDOS</span>
                <span>AMISTAD</span>
                <span>FUTURO</span>
            </div>

            <p
                class="cover-year"
                contenteditable="true"
                data-cover-year
            >${escapeHTML(year)}</p>

        </article>
    `;
}


/* ============================================
   CREAR PÁGINAS DE ESTUDIANTES
============================================ */

async function createStudentPage(pageNumber) {
    const profile = await getProfile(pageNumber);

    const number = String(pageNumber - 1).padStart(2, "0");

    const aspirations = Array.isArray(profile.aspirations)
        ? profile.aspirations
        : defaultProfile.aspirations;

    return `
        <article
            class="book-page student-page"
            data-page="${pageNumber}"
        >

            <img
                src="escudo.png"
                class="student-crest"
                alt="Escudo institucional"
                onerror="this.style.display='none'"
            >

            <header class="page-heading">

                <p class="page-kicker">
                    ANUARIO ESCOLAR · RECUERDOS QUE NOS UNEN
                </p>

                <h2>
                    Mi historia, <span>mi futuro</span>
                </h2>

                <p>Ficha de estudiante Nº ${number}</p>

            </header>

            <section class="profile-top">

                <div class="photo-frame">

                    <div
                        class="photo-placeholder"
                        id="photo-placeholder-${pageNumber}"
                    >
                        <span class="silhouette">●</span>
                        <small>FOTO TIPO CARNET</small>
                    </div>

                    <input
                        type="file"
                        accept="image/*"
                        aria-label="Seleccionar foto"
                        data-photo-input="${pageNumber}"
                    >

                </div>

                <div class="profile-fields">

                    <div class="field-card">
                        <span class="field-label">
                            Nombre completo:
                        </span>

                        ${editable(
                            profile.name,
                            "Escribe tu nombre",
                            "name-edit"
                        )}
                    </div>

                    <div class="field-card">
                        <span class="field-label">
                            Frase favorita:
                        </span>

                        ${editable(
                            profile.phrase,
                            "Tu frase favorita",
                            "phrase-edit"
                        )}
                    </div>

                </div>

            </section>

            <section class="field-card full-field">

                <span class="field-label">
                    Un recuerdo favorito:
                </span>

                ${editable(
                    profile.memory,
                    "Escribe un recuerdo especial",
                    "memory-edit"
                )}

            </section>

            <section class="two-columns">

                <div class="note-box">

                    <h3>✧ Mis aspiraciones</h3>

                    <ul class="aspiration-list">

                        ${aspirations.map((item, index) => `
                            <li>
                                ${editable(
                                    item,
                                    `Sueño ${index + 1}`
                                )}
                            </li>
                        `).join("")}

                    </ul>

                </div>

                <div class="note-box red">

                    <h3>♡ Agradecimientos</h3>

                    ${editable(
                        profile.thanks,
                        "¿A quién quieres agradecer?",
                        "thanks-edit"
                    )}

                </div>

            </section>

            <section class="field-card full-field signature-area">

                <span class="field-label">
                    Firma digitalizada:
                </span>

                <canvas
                    class="signature-pad"
                    id="signature-pad-${pageNumber}"
                    width="900"
                    height="220"
                    aria-label="Dibuja aquí tu firma"
                ></canvas>

                <div class="signature-actions">

                    <button
                        type="button"
                        data-clear-signature="${pageNumber}"
                    >
                        Borrar firma
                    </button>

                    <label for="signature-upload-${pageNumber}">
                        Subir imagen de firma
                    </label>

                    <input
                        type="file"
                        id="signature-upload-${pageNumber}"
                        accept="image/*"
                        data-signature-upload="${pageNumber}"
                    >

                </div>

                <p class="signature-hint">
                    Firma con el mouse, el dedo o un lápiz digital.
                    También puedes subir una imagen.
                </p>

            </section>

            <footer class="page-footer">
                <span>CIENCIA · VIRTUD · AMISTAD</span>
                <strong>${number} / 29</strong>
            </footer>

        </article>
    `;
}


/* ============================================
   MOSTRAR PÁGINA
============================================ */

async function renderPage(pageNumber) {
    book.innerHTML = pageNumber === 1
        ? await createCover()
        : await createStudentPage(pageNumber);

    if (pageNumber > 1) {
        await restorePhoto(pageNumber);
        setupSignaturePad(pageNumber);
        await restoreSignature(pageNumber);
    }

    document.body.classList.toggle("edit-mode", editMode);
}


/* ============================================
   GUARDAR INFORMACIÓN DE TEXTO
============================================ */

async function saveCurrentProfile() {
    const page = book.querySelector(".student-page");

    if (!page) return;

    const pageNumber = Number(page.dataset.page);

    const profile = {
        name: page.querySelector(".name-edit")?.innerText.trim() || "",
        phrase: page.querySelector(".phrase-edit")?.innerText.trim() || "",
        memory: page.querySelector(".memory-edit")?.innerText.trim() || "",

        aspirations: [
            ...page.querySelectorAll(".aspiration-list .editable")
        ].map(item => item.innerText.trim()),

        thanks: page.querySelector(".thanks-edit")?.innerText.trim() || ""
    };

    saveQueue = saveQueue.then(() => {
        return dbSet(
            `anuario-profile-${pageNumber}`,
            profile
        );
    });

    try {
        await saveQueue;
        setStatus("✓ Cambios guardados automáticamente.");
    } catch (error) {
        console.error(error);
        setStatus("No se pudo guardar. Descarga una copia de seguridad.");
    }
}


/* ============================================
   FOTOGRAFÍAS
============================================ */

async function restorePhoto(pageNumber) {
    const saved = await dbGet(
        `anuario-photo-${pageNumber}`
    );

    const holder = document.getElementById(
        `photo-placeholder-${pageNumber}`
    );

    if (!saved || !holder) return;

    const image = document.createElement("img");

    image.src = saved;
    image.alt = "Fotografía del estudiante";

    holder.replaceChildren(image);
}

function readImageFile(file, maxSizeMB) {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith("image/")) {
            reject(new Error("Selecciona una imagen válida."));
            return;
        }

        if (file.size > maxSizeMB * 1024 * 1024) {
            reject(new Error(
                `La imagen debe pesar menos de ${maxSizeMB} MB.`
            ));
            return;
        }

        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);

        reader.readAsDataURL(file);
    });
}

async function handlePhotoUpload(input) {
    const file = input.files?.[0];

    if (!file) return;

    try {
        const imageData = await readImageFile(file, 3);
        const pageNumber = Number(input.dataset.photoInput);

        await dbSet(
            `anuario-photo-${pageNumber}`,
            imageData
        );

        await restorePhoto(pageNumber);

        setStatus("✓ Fotografía guardada correctamente.");
    } catch (error) {
        alert(error.message || "No se pudo guardar la fotografía.");
    }

    input.value = "";
}


/* ============================================
   FIRMAS DIGITALES
============================================ */

function signatureKey(pageNumber) {
    return `anuario-signature-${pageNumber}`;
}

function setupSignaturePad(pageNumber) {
    const canvas = document.getElementById(
        `signature-pad-${pageNumber}`
    );

    if (!canvas || canvas.dataset.ready === "true") return;

    const context = canvas.getContext("2d");

    if (!context) return;

    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#25221f";

    let drawing = false;

    function position(event) {
        const rect = canvas.getBoundingClientRect();

        return {
            x: (event.clientX - rect.left) * canvas.width / rect.width,
            y: (event.clientY - rect.top) * canvas.height / rect.height
        };
    }

    canvas.addEventListener("pointerdown", event => {
        drawing = true;
        canvas.setPointerCapture(event.pointerId);

        const point = position(event);

        context.beginPath();
        context.moveTo(point.x, point.y);

        event.preventDefault();
    });

    canvas.addEventListener("pointermove", event => {
        if (!drawing) return;

        const point = position(event);

        context.lineTo(point.x, point.y);
        context.stroke();

        event.preventDefault();
    });

    async function finishDrawing() {
        if (!drawing) return;

        drawing = false;

        try {
            await dbSet(
                signatureKey(pageNumber),
                canvas.toDataURL("image/png")
            );

            setStatus("✓ Firma guardada correctamente.");
        } catch (error) {
            setStatus("No se pudo guardar la firma.");
        }
    }

    canvas.addEventListener("pointerup", finishDrawing);
    canvas.addEventListener("pointercancel", finishDrawing);
    canvas.addEventListener("pointerleave", event => {
        if (drawing && event.buttons === 0) finishDrawing();
    });

    canvas.dataset.ready = "true";
}

async function restoreSignature(pageNumber) {
    const canvas = document.getElementById(
        `signature-pad-${pageNumber}`
    );

    if (!canvas) return;

    const saved = await dbGet(signatureKey(pageNumber));

    if (!saved) return;

    const context = canvas.getContext("2d");
    const image = new Image();

    image.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };

    image.src = saved;
}

async function clearSignature(pageNumber) {
    const canvas = document.getElementById(
        `signature-pad-${pageNumber}`
    );

    if (!canvas) return;

    canvas.getContext("2d").clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    await dbDelete(signatureKey(pageNumber));

    setStatus("Firma borrada.");
}

async function uploadSignature(input) {
    const file = input.files?.[0];

    if (!file) return;

    try {
        const imageData = await readImageFile(file, 2);
        const pageNumber = Number(input.dataset.signatureUpload);

        const canvas = document.getElementById(
            `signature-pad-${pageNumber}`
        );

        if (!canvas) return;

        const context = canvas.getContext("2d");
        const image = new Image();

        image.onload = async () => {
            context.clearRect(0, 0, canvas.width, canvas.height);

            const scale = Math.min(
                canvas.width / image.width,
                canvas.height / image.height
            );

            const width = image.width * scale;
            const height = image.height * scale;

            context.drawImage(
                image,
                (canvas.width - width) / 2,
                (canvas.height - height) / 2,
                width,
                height
            );

            await dbSet(
                signatureKey(pageNumber),
                canvas.toDataURL("image/png")
            );

            setStatus("✓ Firma guardada correctamente.");
        };

        image.onerror = () => alert("No se pudo abrir la imagen.");
        image.src = imageData;

    } catch (error) {
        alert(error.message || "No se pudo cargar la firma.");
    }

    input.value = "";
}


/* ============================================
   PASAR LAS PÁGINAS
============================================ */

async function turnPage(targetPage, direction = "forward") {
    if (isAnimating) return;

    if (targetPage < 1 || targetPage > TOTAL_PAGES) return;
    if (targetPage === currentPage) return;

    await saveCurrentProfile();

    if (currentPage > 1) {
        const canvas = document.getElementById(
            `signature-pad-${currentPage}`
        );

        if (canvas) {
            await dbSet(
                signatureKey(currentPage),
                canvas.toDataURL("image/png")
            );
        }
    }

    const oldPage = book.querySelector(".book-page");

    if (!oldPage) {
        currentPage = targetPage;
        await renderPage(currentPage);
        updateControls();
        return;
    }

    isAnimating = true;
    updateControls();

    const nextHTML = targetPage === 1
        ? await createCover()
        : await createStudentPage(targetPage);

    const temporary = document.createElement("div");
    temporary.innerHTML = nextHTML.trim();

    const nextPage = temporary.firstElementChild;
    nextPage.classList.add("flip-under");

    book.appendChild(nextPage);

    const turningSheet = oldPage.cloneNode(true);

    turningSheet.classList.add("flip-sheet");

    turningSheet.classList.add(
        direction === "forward"
            ? "flip-forward"
            : "flip-back"
    );

    turningSheet.querySelectorAll(
        "input, button, label"
    ).forEach(element => {
        element.style.visibility = "hidden";
    });

    book.appendChild(turningSheet);
    book.classList.add("is-turning");

    window.setTimeout(async () => {
        currentPage = targetPage;

        await renderPage(currentPage);

        book.classList.remove("is-turning");

        isAnimating = false;
        updateControls();

    }, TURN_DURATION);
}


/* ============================================
   CONTROLES Y PROGRESO
============================================ */

function updateControls() {
    prevButton.disabled = currentPage <= 1 || isAnimating;
    nextButton.disabled = currentPage >= TOTAL_PAGES || isAnimating;

    pageCounter.textContent =
        `${currentPage} / ${TOTAL_PAGES}`;

    progressBar.style.width =
        `${currentPage / TOTAL_PAGES * 100}%`;
}

prevButton.addEventListener("click", () => {
    turnPage(currentPage - 1, "back");
});

nextButton.addEventListener("click", () => {
    turnPage(currentPage + 1, "forward");
});


/* ============================================
   TECLAS DEL TECLADO
============================================ */

document.addEventListener("keydown", event => {
    if (helpDialog?.open) return;
    if (event.target.isContentEditable) return;

    if (["INPUT", "TEXTAREA", "BUTTON"].includes(
        event.target.tagName
    )) return;

    if (event.key === "ArrowRight") {
        turnPage(currentPage + 1, "forward");
    }

    if (event.key === "ArrowLeft") {
        turnPage(currentPage - 1, "back");
    }
});


/* ============================================
   GUARDADO AUTOMÁTICO DE LOS TEXTOS
============================================ */

book.addEventListener("input", event => {
    if (event.target.matches(".editable")) {
        saveCurrentProfile();
    }

    if (event.target.matches("[data-cover-year]")) {
        dbSet(
            "anuario-cover-year",
            event.target.innerText.trim()
        );
    }
});


/* ============================================
   CARGAR FOTOGRAFÍAS Y FIRMAS
============================================ */

book.addEventListener("change", event => {
    const photoInput = event.target.closest("[data-photo-input]");

    if (photoInput) {
        handlePhotoUpload(photoInput);
    }

    const signatureInput = event.target.closest(
        "[data-signature-upload]"
    );

    if (signatureInput) {
        uploadSignature(signatureInput);
    }
});

book.addEventListener("click", event => {
    const clearButton = event.target.closest(
        "[data-clear-signature]"
    );

    if (clearButton) {
        clearSignature(
            Number(clearButton.dataset.clearSignature)
        );
    }
});


/* ============================================
   MODO DE EDICIÓN
============================================ */

editModeButton.addEventListener("click", () => {
    editMode = !editMode;

    document.body.classList.toggle("edit-mode", editMode);

    editModeButton.textContent = editMode
        ? "Desactivar modo de edición"
        : "✏️ Activar edición";
});


/* ============================================
   GUARDAR COPIA COMPLETA DEL ANUARIO
============================================ */

async function saveCompleteBook() {
    try {
        await saveCurrentProfile();

        const records = await dbGetAll();

        const backup = {
            project: "Anuario Escolar Eugenio Ferro Falla",
            version: 1,
            date: new Date().toISOString(),
            records: records
        };

        const file = new Blob(
            [JSON.stringify(backup)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(file);
        const link = document.createElement("a");

        link.href = url;
        link.download = "Mi_Anuario_Escolar.json";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setStatus("✓ Copia descargada correctamente.");

    } catch (error) {
        console.error(error);
        alert("No se pudo guardar la copia del anuario.");
    }
}

saveBookButton.addEventListener("click", saveCompleteBook);


/* ============================================
   CARGAR UNA COPIA DEL ANUARIO
============================================ */

async function loadCompleteBook(file) {
    if (!file) return;

    try {
        const text = await file.text();
        const backup = JSON.parse(text);

        if (
            backup.project !== "Anuario Escolar Eugenio Ferro Falla" ||
            !Array.isArray(backup.records)
        ) {
            throw new Error("El archivo no es una copia válida.");
        }

        const confirmed = confirm(
            "¿Deseas cargar esta copia? " +
            "La información actual del anuario será reemplazada."
        );

        if (!confirmed) return;

        await dbReplaceAll(backup.records);

        currentPage = 1;
        isAnimating = false;

        await renderPage(currentPage);
        updateControls();

        setStatus("✓ Anuario recuperado correctamente.");

        alert("¡Tu anuario se ha cargado correctamente!");

    } catch (error) {
        console.error(error);
        alert(
            error.message ||
            "No se pudo cargar el archivo."
        );
    }
}

loadBookButton.addEventListener("click", () => {
    loadBookInput.click();
});

loadBookInput.addEventListener("change", () => {
    const file = loadBookInput.files?.[0];

    if (file) {
        loadCompleteBook(file);
    }

    loadBookInput.value = "";
});


/* ============================================
   RESTABLECER EL ANUARIO
============================================ */

resetButton.addEventListener("click", async () => {
    const confirmed = confirm(
        "¿Quieres borrar todos los cambios guardados " +
        "y restaurar el anuario? Esta acción no se puede deshacer."
    );

    if (!confirmed) return;

    try {
        const records = await dbGetAll();

        await dbReplaceAll([]);

        currentPage = 1;
        isAnimating = false;

        await renderPage(currentPage);
        updateControls();

        setStatus("Anuario restablecido.");

    } catch (error) {
        alert("No se pudo restablecer el anuario.");
    }
});


/* ============================================
   VENTANA DE AYUDA
============================================ */

helpButton.addEventListener("click", () => {
    helpDialog.showModal();
});

closeHelp.addEventListener("click", () => {
    helpDialog.close();
});


/* ============================================
   INICIAR EL ANUARIO
============================================ */

async function startYearbook() {
    try {
        database = await openDatabase();

        await renderPage(currentPage);
        updateControls();

        setStatus("✓ Anuario listo. Guardado automático activado.");

        console.log("Anuario escolar listo.");

    } catch (error) {
        console.error(error);

        setStatus(
            "No se pudo iniciar el guardado. Abre el anuario desde un navegador compatible."
        );

        alert(
            "No se pudo activar el almacenamiento. " +
            "Prueba abrir el anuario con Chrome o Edge."
        );
    }
}

startYearbook();
async function saveCompleteBook() {
    try {
        await saveCurrentProfile();

        const records = await dbGetAll();

        const backup = {
            project: "Anuario Escolar Eugenio Ferro Falla",
            version: 1,
            date: new Date().toISOString(),
            records: records
        };

        const file = new Blob(
            [JSON.stringify(backup)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(file);
        const link = document.createElement("a");

        link.href = url;
        link.download = "Mi_Anuario_Escolar.json";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setStatus("✓ Copia de seguridad descargada correctamente.");

    } catch (error) {
        alert("No se pudo crear la copia de seguridad.");
    }
}
async function saveCompleteBook() {
    try {
        await saveCurrentProfile();

        const records = await dbGetAll();

        const backup = {
            project: "Anuario Escolar Eugenio Ferro Falla",
            version: 1,
            date: new Date().toISOString(),
            records: records
        };

        const file = new Blob(
            [JSON.stringify(backup)],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(file);
        const link = document.createElement("a");

        link.href = url;
        link.download = "Mi_Anuario_Escolar.json";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        setStatus("✓ Copia de seguridad descargada correctamente.");

    } catch (error) {
        alert("No se pudo crear la copia de seguridad.");
    }
}
function setupComments() {
    document.querySelectorAll(".comments-section").forEach(section => {
        const page = section.closest(".student-page");
        if (!page) return;

        const pageNumber = page.dataset.page;
        const textarea = section.querySelector(".comments-box");
        const button = section.querySelector(".save-comment");
        const status = section.querySelector(".comment-status");

        const savedComment = getSaved(
            `anuario-comment-${pageNumber}`
        );

        if (savedComment !== null) {
            textarea.value = savedComment;
        }

        button.addEventListener("click", () => {
            if (!creatorUnlocked || !editMode) {
                status.textContent = "Activa el modo de edición para guardar.";
                return;
            }

            saveData(
                `anuario-comment-${pageNumber}`,
                textarea.value
            );

            status.textContent = "¡Comentario guardado correctamente!";
        });
    });
}

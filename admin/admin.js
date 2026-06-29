// State
let state = {
    products: [],
    lookbook: [],
    settings: { desktop_banners: [], mobile_banner: "" },
    hasChanges: false,
    editingProductIndex: -1 // -1 means new product
};

// Elements
const el = {
    loginScreen: document.getElementById('login-screen'),
    adminApp: document.getElementById('admin-app'),
    btnLogin: document.getElementById('btn-login'),
    btnLogout: document.getElementById('btn-logout'),
    btnSave: document.getElementById('btn-save'),
    saveStatus: document.getElementById('save-status'),
    navItems: document.querySelectorAll('.nav-item[data-tab]'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Grids
    productsList: document.getElementById('products-list'),
    lookbookList: document.getElementById('lookbook-list'),
    settingsDesktopBanners: document.getElementById('settings-desktop-banners'),
    settingsMobileBanner: document.getElementById('settings-mobile-banner'),

    // Modals
    productModal: document.getElementById('product-modal'),
    productForm: document.getElementById('product-form'),
    btnCancelModal: document.getElementById('btn-cancel-modal'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnSaveModal: document.getElementById('btn-save-modal'),
    btnDeleteProduct: document.getElementById('btn-delete-product'),
    
    loadingOverlay: document.getElementById('loading-overlay')
};

// Initialize Netlify Identity
if (window.netlifyIdentity) {
    window.netlifyIdentity.on("init", user => {
        if (!user) {
            showLogin();
        } else {
            showAdmin();
        }
    });
    window.netlifyIdentity.on("login", () => {
        window.netlifyIdentity.close();
        showAdmin();
    });
    window.netlifyIdentity.on("logout", () => {
        showLogin();
    });
}

function showLogin() {
    el.loginScreen.style.display = 'flex';
    el.adminApp.style.display = 'none';
}

function showAdmin() {
    el.loginScreen.style.display = 'none';
    el.adminApp.style.display = 'flex';
    loadData();
}

el.btnLogin.addEventListener('click', () => window.netlifyIdentity.open());
el.btnLogout.addEventListener('click', () => window.netlifyIdentity.logout());

// Tab Navigation
el.navItems.forEach(item => {
    item.addEventListener('click', () => {
        el.navItems.forEach(nav => nav.classList.remove('active'));
        el.tabContents.forEach(tab => tab.classList.remove('active'));
        
        item.classList.add('active');
        document.getElementById(`tab-${item.dataset.tab}`).classList.add('active');
        
        const titles = { products: 'Catálogo de Produtos', lookbook: 'Galeria do Lookbook', settings: 'Configurações do Site' };
        document.getElementById('page-title').textContent = titles[item.dataset.tab];
    });
});

// Load Data from JSON files
async function loadData() {
    try {
        const [prodRes, lookRes, setRes] = await Promise.all([
            fetch('/data/products.json'),
            fetch('/data/lookbook.json'),
            fetch('/data/settings.json')
        ]);
        
        const prodData = await prodRes.json();
        const lookData = await lookRes.json();
        const setData = await setRes.json();
        
        state.products = prodData.products || [];
        state.lookbook = lookData.lookbook || [];
        state.settings = setData || { desktop_banners: [], mobile_banner: "" };
        
        renderProducts();
        renderLookbook();
        renderSettings();
        
        markSaved();
    } catch (e) {
        console.error("Erro ao carregar dados", e);
        alert("Erro ao carregar os dados. Verifique a conexão.");
    }
}

// Mark state as changed
function markUnsaved() {
    state.hasChanges = true;
    el.btnSave.disabled = false;
    el.saveStatus.textContent = "Alterações não salvas";
    el.saveStatus.style.color = "var(--text-main)";
}

function markSaved() {
    state.hasChanges = false;
    el.btnSave.disabled = true;
    el.saveStatus.textContent = "Todas as alterações salvas";
    el.saveStatus.style.color = "var(--text-muted)";
}

// Render Products
function renderProducts() {
    el.productsList.innerHTML = '';
    state.products.forEach((prod, index) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img class="product-image" src="/${prod.main_image || ''}" onerror="this.src=''" alt="${prod.name}">
            <div class="product-info">
                <div class="product-meta">
                    <span class="badge ${prod.is_active ? 'active' : 'inactive'}">${prod.is_active ? 'Visível' : 'Oculto'}</span>
                    <span>R$ ${parseFloat(prod.price || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                <h4>${prod.name}</h4>
                <p style="font-size:13px; color:var(--text-muted)">${prod.status} • ${prod.category}</p>
            </div>
        `;
        card.addEventListener('click', () => openProductModal(index));
        el.productsList.appendChild(card);
    });
}

// Product Modal Logic
document.getElementById('btn-add-product').addEventListener('click', () => openProductModal(-1));
el.btnCancelModal.addEventListener('click', closeProductModal);
el.btnCloseModal.addEventListener('click', closeProductModal);

// Extra images state for the current modal
let currentExtraImages = [];

function openProductModal(index) {
    state.editingProductIndex = index;
    el.productModal.style.display = 'flex';
    document.getElementById('modal-title').textContent = index >= 0 ? 'Editar Produto' : 'Novo Produto';
    
    // Reset Form
    el.productForm.reset();
    document.getElementById('preview-main').style.display = 'none';
    document.getElementById('preview-hover').style.display = 'none';
    currentExtraImages = [];
    renderExtraImages();
    
    if (index >= 0) {
        const p = state.products[index];
        document.getElementById('prod-active').checked = p.is_active !== false;
        document.getElementById('prod-name').value = p.name || '';
        document.getElementById('prod-price').value = p.price || 0;
        document.getElementById('prod-status').value = p.status || 'Disponível';
        document.getElementById('prod-category').value = p.category || 'CLUB-01';
        
        if (p.main_image) {
            document.getElementById('preview-main').src = '/' + p.main_image;
            document.getElementById('preview-main').style.display = 'block';
            document.getElementById('preview-main').dataset.path = p.main_image;
        }
        if (p.hover_image) {
            document.getElementById('preview-hover').src = '/' + p.hover_image;
            document.getElementById('preview-hover').style.display = 'block';
            document.getElementById('preview-hover').dataset.path = p.hover_image;
        }
        if (p.extra_images) {
            currentExtraImages = [...p.extra_images];
            renderExtraImages();
        }
        el.btnDeleteProduct.style.display = 'block';
    } else {
        document.getElementById('prod-active').checked = true;
        el.btnDeleteProduct.style.display = 'none';
    }
}

function closeProductModal() {
    el.productModal.style.display = 'none';
}

// Generic Image Reader
function setupImageUpload(triggerId, inputId, previewId) {
    document.getElementById(triggerId).addEventListener('click', () => {
        document.getElementById(inputId).click();
    });
    document.getElementById(inputId).addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                const img = document.getElementById(previewId);
                img.src = ev.target.result;
                img.style.display = 'block';
                img.dataset.isNew = "true";
                img.dataset.filename = e.target.files[0].name;
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}
setupImageUpload('upload-main', 'file-main', 'preview-main');
setupImageUpload('upload-hover', 'file-hover', 'preview-hover');

// Extra Images
document.getElementById('btn-add-extra').addEventListener('click', () => {
    document.getElementById('file-extra').click();
});
document.getElementById('file-extra').addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(ev) {
            currentExtraImages.push({
                dataUrl: ev.target.result,
                filename: e.target.files[0].name,
                isNew: true
            });
            renderExtraImages();
        }
        reader.readAsDataURL(e.target.files[0]);
    }
});

function renderExtraImages() {
    const container = document.getElementById('prod-extra-images');
    container.innerHTML = '';
    currentExtraImages.forEach((img, i) => {
        const div = document.createElement('div');
        div.className = 'image-upload';
        const src = img.isNew ? img.dataUrl : '/' + img;
        div.innerHTML = `
            <img src="${src}">
            <button type="button" class="btn-remove-mini" onclick="removeExtraImage(${i})">X</button>
        `;
        container.appendChild(div);
    });
}
window.removeExtraImage = (i) => {
    currentExtraImages.splice(i, 1);
    renderExtraImages();
};

el.btnSaveModal.addEventListener('click', () => {
    const name = document.getElementById('prod-name').value;
    if (!name) return alert("O nome da peça é obrigatório.");
    
    // We store dataUrls for new images, we will process them during final save
    const p = {
        is_active: document.getElementById('prod-active').checked,
        name: name,
        price: parseFloat(document.getElementById('prod-price').value || 0),
        status: document.getElementById('prod-status').value,
        category: document.getElementById('prod-category').value
    };
    
    const mainImg = document.getElementById('preview-main');
    if (mainImg.dataset.isNew) {
        p.main_image_new = { dataUrl: mainImg.src, filename: mainImg.dataset.filename };
    } else if (mainImg.dataset.path) {
        p.main_image = mainImg.dataset.path;
    }

    const hoverImg = document.getElementById('preview-hover');
    if (hoverImg.dataset.isNew) {
        p.hover_image_new = { dataUrl: hoverImg.src, filename: hoverImg.dataset.filename };
    } else if (hoverImg.dataset.path) {
        p.hover_image = hoverImg.dataset.path;
    }
    
    if (currentExtraImages.length > 0) {
        p.extra_images = currentExtraImages;
    }

    if (state.editingProductIndex >= 0) {
        state.products[state.editingProductIndex] = p;
    } else {
        state.products.push(p);
    }
    
    renderProducts();
    closeProductModal();
    markUnsaved();
});

el.btnDeleteProduct.addEventListener('click', () => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
        state.products.splice(state.editingProductIndex, 1);
        renderProducts();
        closeProductModal();
        markUnsaved();
    }
});

// Render Lookbook
function renderLookbook() {
    el.lookbookList.innerHTML = '';
    state.lookbook.forEach((img, i) => {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        const src = img.isNew ? img.dataUrl : '/' + img;
        div.innerHTML = `
            <img src="${src}">
            <button type="button" class="btn-remove" onclick="removeLookbook(${i})">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;
        el.lookbookList.appendChild(div);
    });
}
window.removeLookbook = (i) => {
    state.lookbook.splice(i, 1);
    renderLookbook();
    markUnsaved();
};

document.getElementById('btn-add-lookbook').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = e => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                state.lookbook.push({
                    isNew: true,
                    dataUrl: ev.target.result,
                    filename: e.target.files[0].name
                });
                renderLookbook();
                markUnsaved();
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    };
    input.click();
});

// Render Settings
function renderSettings() {
    el.settingsDesktopBanners.innerHTML = '';
    const banners = state.settings.desktop_banners || [];
    banners.forEach((img, i) => {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        const src = img.isNew ? img.dataUrl : '/' + img;
        div.innerHTML = `
            <img src="${src}">
            <button type="button" class="btn-remove" onclick="removeBanner(${i})">X</button>
        `;
        el.settingsDesktopBanners.appendChild(div);
    });
    
    el.settingsMobileBanner.innerHTML = '';
    const mobileDiv = document.createElement('div');
    mobileDiv.className = 'image-upload';
    const mobileSrc = state.settings.mobile_banner?.isNew ? state.settings.mobile_banner.dataUrl : (state.settings.mobile_banner ? '/' + state.settings.mobile_banner : '');
    mobileDiv.innerHTML = `
        <img src="${mobileSrc}" style="display: ${mobileSrc ? 'block' : 'none'}">
        <div class="upload-placeholder"><span>Clique para alterar</span></div>
    `;
    mobileDiv.onclick = () => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.onchange = e => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = ev => {
                    state.settings.mobile_banner = { isNew: true, dataUrl: ev.target.result, filename: e.target.files[0].name };
                    renderSettings();
                    markUnsaved();
                }
                reader.readAsDataURL(e.target.files[0]);
            }
        };
        input.click();
    };
    el.settingsMobileBanner.appendChild(mobileDiv);
}

window.removeBanner = (i) => {
    state.settings.desktop_banners.splice(i, 1);
    renderSettings();
    markUnsaved();
};
document.getElementById('btn-add-desktop-banner').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = e => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = ev => {
                if(!state.settings.desktop_banners) state.settings.desktop_banners = [];
                state.settings.desktop_banners.push({
                    isNew: true, dataUrl: ev.target.result, filename: e.target.files[0].name
                });
                renderSettings();
                markUnsaved();
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    };
    input.click();
});

// Final Save Process
el.btnSave.addEventListener('click', async () => {
    if (!window.netlifyIdentity.currentUser()) {
        alert("Você precisa estar logado!");
        return;
    }
    
    el.loadingOverlay.style.display = 'flex';
    
    // We need to send the current state to our Netlify Function.
    // The function will handle base64 decoding and saving.
    
    const token = await window.netlifyIdentity.currentUser().jwt();
    
    try {
        const res = await fetch('/.netlify/functions/save-data', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(state)
        });
        
        if (!res.ok) {
            throw new Error(await res.text());
        }
        
        markSaved();
        alert("Sucesso! As alterações foram enviadas e o site será atualizado em alguns instantes.");
        
        // Reload data to get clean state (paths instead of dataUrls)
        await loadData();
        
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar: " + e.message);
    } finally {
        el.loadingOverlay.style.display = 'none';
    }
});

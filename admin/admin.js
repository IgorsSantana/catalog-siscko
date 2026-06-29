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
        
        const titles = { products: 'Catálogo de Produtos', lookbook: 'Galeria do Lookbook', settings: 'Configurações do Site', crm: 'Gestão de Pedidos e CRM', users: 'Gestão de Equipe e Clientes' };
        document.getElementById('page-title').textContent = titles[item.dataset.tab];
        
        if(item.dataset.tab === 'crm') {
            loadCrmData();
        }
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
        
        // Defaults if missing
        state.settings = setData || {};
        state.settings.desktop_banners = state.settings.desktop_banners || [];
        state.settings.hero = state.settings.hero || { title: "NOVO DROP", subtitle: "Minimalist streetwear for the bold.", btnText: "VIEW CATALOG", btnLink: "#club-01" };
        state.settings.sections = state.settings.sections || [
            { title: "CLUB-01", subtitle: "Disponível agora." },
            { title: "EM BREVE", subtitle: "Os próximos lançamentos da Siscko." }
        ];
        state.settings.footerText = state.settings.footerText || "Streetwear culture redefined. Designed for the streets.";
        state.settings.social = state.settings.social || { instagram: "https://instagram.com/sisckobr", whatsapp: "https://wa.me/5532999782790" };
        state.settings.specs = state.settings.specs || { comp: "100% Algodão", malha: "Fio 30.1 Premium", gramatura: "230g/m²", fit: "Mangas normalmente abaixo do cotovelo" };
        
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

// --- Drag & Drop Reordering Logic ---
let draggedIndex = null;
let draggedType = null;
let isDragging = false;

function handleDragStart(e, index, type) {
    draggedIndex = index;
    draggedType = type;
    isDragging = true;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e, targetIndex, type) {
    e.preventDefault();
    const targetEl = e.target.closest('[draggable="true"]');
    if(targetEl) targetEl.style.opacity = '1';
    
    if (draggedIndex === null || draggedType !== type || draggedIndex === targetIndex) return;

    let array;
    if (type === 'product') array = state.products;
    else if (type === 'lookbook') array = state.lookbook;
    else if (type === 'extra') array = currentExtraImages;

    const [removed] = array.splice(draggedIndex, 1);
    array.splice(targetIndex, 0, removed);

    if (type === 'product') renderProducts();
    else if (type === 'lookbook') renderLookbook();
    else if (type === 'extra') renderExtraImages();
    
    markUnsaved();
}

function handleDragEnd(e) {
    e.target.style.opacity = '1';
    draggedIndex = null;
    draggedType = null;
    setTimeout(() => { isDragging = false; }, 200);
}

// Render Products
function renderProducts() {
    el.productsList.innerHTML = '';
    state.products.forEach((prod, index) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.draggable = true;
        card.innerHTML = `
            <img class="product-image" src="/${prod.main_image || ''}" onerror="this.src=''" alt="${prod.name}" draggable="false">
            <div class="product-info">
                <div class="product-meta">
                    <span class="badge ${prod.is_active ? 'active' : 'inactive'}">${prod.is_active ? 'Visível' : 'Oculto'}</span>
                    <span>R$ ${parseFloat(prod.price || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                <h4>${prod.name}</h4>
                <p style="font-size:13px; color:var(--text-muted)">${prod.status} • ${prod.category}</p>
            </div>
        `;
        
        card.addEventListener('dragstart', (e) => handleDragStart(e, index, 'product'));
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', (e) => handleDrop(e, index, 'product'));
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('click', (e) => {
            if (!isDragging) openProductModal(index);
        });
        
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
        div.draggable = true;
        const src = img.isNew ? img.dataUrl : '/' + img;
        div.innerHTML = `
            <img src="${src}" draggable="false">
            <button type="button" class="btn-remove-mini" onclick="removeExtraImage(${i})">X</button>
        `;
        
        div.addEventListener('dragstart', (e) => handleDragStart(e, i, 'extra'));
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', (e) => handleDrop(e, i, 'extra'));
        div.addEventListener('dragend', handleDragEnd);
        
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
        div.draggable = true;
        const src = img.isNew ? img.dataUrl : '/' + img;
        div.innerHTML = `
            <img src="${src}" draggable="false">
            <button type="button" class="btn-remove" onclick="removeLookbook(${i})">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;
        
        div.addEventListener('dragstart', (e) => handleDragStart(e, i, 'lookbook'));
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', (e) => handleDrop(e, i, 'lookbook'));
        div.addEventListener('dragend', handleDragEnd);
        
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

    // Populate Texts
    document.getElementById('set-hero-title').value = state.settings.hero.title || "";
    document.getElementById('set-hero-subtitle').value = state.settings.hero.subtitle || "";
    document.getElementById('set-hero-btn-text').value = state.settings.hero.btnText || "";
    document.getElementById('set-hero-btn-link').value = state.settings.hero.btnLink || "";
    
    document.getElementById('set-section1-title').value = state.settings.sections[0]?.title || "";
    document.getElementById('set-section1-subtitle').value = state.settings.sections[0]?.subtitle || "";
    document.getElementById('set-section2-title').value = state.settings.sections[1]?.title || "";
    document.getElementById('set-section2-subtitle').value = state.settings.sections[1]?.subtitle || "";
    
    document.getElementById('set-footer-text').value = state.settings.footerText || "";
    document.getElementById('set-social-ig').value = state.settings.social.instagram || "";
    document.getElementById('set-social-wa').value = state.settings.social.whatsapp || "";
    
    document.getElementById('set-specs-comp').value = state.settings.specs.comp || "";
    document.getElementById('set-specs-malha').value = state.settings.specs.malha || "";
    document.getElementById('set-specs-grama').value = state.settings.specs.gramatura || "";
    document.getElementById('set-specs-fit').value = state.settings.specs.fit || "";
}

// Bind Settings Inputs
const settingInputs = [
    { id: 'set-hero-title', obj: 'hero', key: 'title' },
    { id: 'set-hero-subtitle', obj: 'hero', key: 'subtitle' },
    { id: 'set-hero-btn-text', obj: 'hero', key: 'btnText' },
    { id: 'set-hero-btn-link', obj: 'hero', key: 'btnLink' },
    { id: 'set-section1-title', obj: 'sections_0', key: 'title' },
    { id: 'set-section1-subtitle', obj: 'sections_0', key: 'subtitle' },
    { id: 'set-section2-title', obj: 'sections_1', key: 'title' },
    { id: 'set-section2-subtitle', obj: 'sections_1', key: 'subtitle' },
    { id: 'set-footer-text', obj: null, key: 'footerText' },
    { id: 'set-social-ig', obj: 'social', key: 'instagram' },
    { id: 'set-social-wa', obj: 'social', key: 'whatsapp' },
    { id: 'set-specs-comp', obj: 'specs', key: 'comp' },
    { id: 'set-specs-malha', obj: 'specs', key: 'malha' },
    { id: 'set-specs-grama', obj: 'specs', key: 'gramatura' },
    { id: 'set-specs-fit', obj: 'specs', key: 'fit' }
];

settingInputs.forEach(cfg => {
    document.getElementById(cfg.id).addEventListener('input', (e) => {
        if (cfg.obj === 'sections_0') state.settings.sections[0][cfg.key] = e.target.value;
        else if (cfg.obj === 'sections_1') state.settings.sections[1][cfg.key] = e.target.value;
        else if (cfg.obj) state.settings[cfg.obj][cfg.key] = e.target.value;
        else state.settings[cfg.key] = e.target.value;
        markUnsaved();
    });
});

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

// --- CRM Logic ---

document.getElementById('btn-refresh-crm').addEventListener('click', loadCrmData);

async function loadCrmData() {
    const errorEl = document.getElementById('crm-error');
    errorEl.style.display = 'none';
    
    if (!window.netlifyIdentity.currentUser()) {
        errorEl.textContent = "Você precisa estar logado para acessar o CRM.";
        errorEl.style.display = 'block';
        return;
    }
    
    try {
        const token = await window.netlifyIdentity.currentUser().jwt();
        const res = await fetch('/.netlify/functions/admin-stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.status === 403) {
            throw new Error("Acesso Negado: Apenas administradores podem ver o CRM. Por favor, adicione o role 'admin' ao seu usuário no Netlify Identity.");
        }
        
        if (!res.ok) {
            throw new Error("Erro ao buscar dados do CRM: " + await res.text());
        }
        
        const data = await res.json();
        renderCrmData(data);
        
    } catch (e) {
        console.error(e);
        errorEl.textContent = e.message;
        errorEl.style.display = 'block';
        
        document.getElementById('crm-orders-body').innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger);">Falha ao carregar</td></tr>';
        document.getElementById('crm-carts-body').innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--danger);">Falha ao carregar</td></tr>';
    }
}

function renderCrmData(data) {
    const { pedidos = [], carrinhos = [] } = data;
    
    // Calculate KPIs
    let revenue = 0;
    let paidCount = 0;
    
    pedidos.forEach(p => {
        if (p.status === 'pago') {
            revenue += (p.total_cents || 0) / 100;
            paidCount++;
        }
    });
    
    document.getElementById('kpi-revenue').textContent = 'R$ ' + revenue.toFixed(2).replace('.', ',');
    document.getElementById('kpi-orders-paid').textContent = paidCount;
    document.getElementById('kpi-abandoned').textContent = carrinhos.length;
    
    // Render Orders
    const ordersBody = document.getElementById('crm-orders-body');
    ordersBody.innerHTML = '';
    
    if (pedidos.length === 0) {
        ordersBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum pedido encontrado.</td></tr>';
    } else {
        // Sort newest first
        pedidos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        pedidos.forEach(p => {
            const tr = document.createElement('tr');
            const date = new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const statusClass = p.status === 'pago' ? 'active' : (p.status === 'pendente' ? 'inactive' : '');
            
            tr.innerHTML = `
                <td>#${p.id || '-'}</td>
                <td>${p.email || 'Anônimo'}</td>
                <td><span class="badge ${statusClass}">${p.status || 'Desconhecido'}</span></td>
                <td>R$ ${((p.total_cents || 0) / 100).toFixed(2).replace('.', ',')}</td>
                <td>${date}</td>
            `;
            ordersBody.appendChild(tr);
        });
    }
    
    // Render Abandoned Carts
    const cartsBody = document.getElementById('crm-carts-body');
    cartsBody.innerHTML = '';
    
    if (carrinhos.length === 0) {
        cartsBody.innerHTML = '<tr><td colspan="3" style="text-align: center;">Nenhum carrinho abandonado.</td></tr>';
    } else {
        carrinhos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        
        carrinhos.forEach(c => {
            const tr = document.createElement('tr');
            const date = new Date(c.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            tr.innerHTML = `
                <td>${c.email || 'Anônimo'}</td>
                <td>${Array.isArray(c.items) ? c.items.length : 0} item(ns)</td>
                <td>${date}</td>
            `;
            cartsBody.appendChild(tr);
        });
    }
}

// ==========================================
// USER MANAGEMENT LOGIC
// ==========================================
document.getElementById('btn-refresh-users').addEventListener('click', loadUsers);

async function loadUsers() {
    const errorEl = document.getElementById('users-error');
    errorEl.style.display = 'none';
    
    const user = window.netlifyIdentity.currentUser();
    if (!user) return;
    
    try {
        const token = await user.jwt();
        const res = await fetch('/.netlify/functions/admin-users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao carregar usuários');
        }
        
        renderUsers(data.users);
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum usuário encontrado.</td></tr>';
        return;
    }
    
    users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    users.forEach(u => {
        const tr = document.createElement('tr');
        const date = new Date(u.created_at).toLocaleDateString('pt-BR');
        const isAdmin = u.roles && u.roles.includes('admin');
        
        const badgeHTML = isAdmin 
            ? '<span class="badge badge-admin">Admin</span>' 
            : '<span class="badge badge-user">Cliente</span>';
            
        const actionBtnHTML = isAdmin
            ? `<button class="btn-toggle-role remove" onclick="toggleAdminRole('${u.id}', false)">Remover Admin</button>`
            : `<button class="btn-toggle-role add" onclick="toggleAdminRole('${u.id}', true)">Promover a Admin</button>`;
            
        tr.innerHTML = `
            <td>${u.email}</td>
            <td>${date}</td>
            <td>${badgeHTML}</td>
            <td>${actionBtnHTML}</td>
        `;
        tbody.appendChild(tr);
    });
}

window.toggleAdminRole = async (userId, makeAdmin) => {
    const user = window.netlifyIdentity.currentUser();
    if (!user) return;
    
    // Confirmação para evitar cliques acidentais
    if (makeAdmin) {
        if (!confirm('Tem certeza que deseja dar permissões de Administrador a este usuário? Ele terá controle total do painel.')) return;
    } else {
        if (!confirm('Tem certeza que deseja remover o acesso administrativo deste usuário?')) return;
    }
    
    try {
        const token = await user.jwt();
        const res = await fetch('/.netlify/functions/admin-users', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId,
                roles: makeAdmin ? ['admin'] : []
            })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao atualizar permissão');
        }
        
        // Recarrega a tabela se sucesso
        loadUsers();
    } catch (err) {
        alert(err.message);
    }
};

// Bind Users tab click
const usersTabBtn = document.querySelector('.nav-item[data-tab="users"]');
if (usersTabBtn) {
    usersTabBtn.addEventListener('click', loadUsers);
}

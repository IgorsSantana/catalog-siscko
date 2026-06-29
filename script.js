document.addEventListener('DOMContentLoaded', () => {

    // --- Helper function para prevenir XSS ---
    function escapeHTML(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // --- Netlify Identity Logic ---
    const loginLinks = document.querySelectorAll('#login-link, .login-action-mobile');
    
    function updateLoginState(user) {
        loginLinks.forEach(link => {
            if (user) {
                // Se for mobile e o texto original era só 'Conta', mantém curto. Se for desktop, 'Minha Conta'.
                link.innerText = link.classList.contains('mobile-only') ? 'Conta' : 'Minha Conta';
                link.onclick = (e) => {
                    e.preventDefault();
                    window.location.href = 'conta.html';
                };
            } else {
                link.innerText = link.classList.contains('mobile-only') ? 'Entrar' : 'Entrar / Cadastrar';
                link.onclick = (e) => {
                    e.preventDefault();
                    if(window.netlifyIdentity) window.netlifyIdentity.open('login');
                };
            }
        });
    }

    if (window.netlifyIdentity) {
        // Inicializa o widget (necessário quando não usamos os atributos data- html)
        window.netlifyIdentity.init();
        
        // Define o estado atual imediatamente
        updateLoginState(window.netlifyIdentity.currentUser());

        window.netlifyIdentity.on('init', user => updateLoginState(user));
        window.netlifyIdentity.on('login', user => {
            updateLoginState(user);
            window.netlifyIdentity.close();
        });
        window.netlifyIdentity.on('logout', () => updateLoginState(null));
    }

    // --- Fetch and Render Products ---
    fetch('data/products.json')
        .then(res => {
            if (!res.ok) throw new Error("Não foi possível carregar os produtos");
            return res.json();
        })
        .then(data => {
            if (data && data.products) {
                renderProducts(data.products);
            }
        })
        .catch(err => {
            console.error("Erro carregando produtos:", err);
        });

    function renderProducts(products) {
        const club01Grid = document.getElementById('club-01-grid');
        const emBreveGrid = document.getElementById('em-breve-grid');
        const allProductsGrid = document.getElementById('all-products-grid');

        products.forEach(product => {
            // Se is_active for estritamente false, não renderizar o produto no site
            if (product.is_active === false) return;

            const isEmBreve = product.status === "Em Breve";
            const isEsgotado = product.status === "Esgotado";
            const isDisabled = isEmBreve || isEsgotado;
            
            let priceDisplay = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
            if (isEmBreve) priceDisplay = "EM BREVE";
            if (isEsgotado) priceDisplay = "ESGOTADO";
            
            const disabledClass = isDisabled ? "disabled" : "";
            const disabledAttr = isDisabled ? "disabled" : "";
            
            let btnText = "ADD TO CART";
            if (isEmBreve) btnText = "EM BREVE";
            if (isEsgotado) btnText = "ESGOTADO";

            let imagesHTML = "";
            let dotsHTML = "";
            
            // Reconstruir o array de imagens a partir da nova estrutura do CMS
            let productImages = [];
            if (product.main_image) productImages.push(product.main_image);
            if (product.hover_image) productImages.push(product.hover_image);
            if (product.extra_images && product.extra_images.length > 0) {
                productImages = productImages.concat(product.extra_images);
            }
            // Fallback para estrutura antiga caso ainda exista
            if (productImages.length === 0 && product.images && product.images.length > 0) {
                productImages = product.images;
            }
            
            if (productImages.length > 0) {
                productImages.forEach((img, i) => {
                    const activeClass = i === 0 ? "active" : "";
                    const safeImg = escapeHTML(img);
                    imagesHTML += `<img src="${safeImg}" alt="${escapeHTML(product.name)} ${i+1}" class="carousel-img ${activeClass}" loading="lazy">`;
                    dotsHTML += `<span class="dot ${activeClass}"></span>`;
                });
            } else {
                imagesHTML = `<div class="placeholder-img">Sem imagem</div>`;
            }

            const cardHTML = `
                <div class="product-card" data-name="${escapeHTML(product.name)}" data-price="${product.price}">
                    <div class="carousel">
                        <button class="carousel-btn prev-btn">&lt;</button>
                        <div class="carousel-track">
                            ${imagesHTML}
                        </div>
                        <button class="carousel-btn next-btn">&gt;</button>
                        <div class="dots-container">
                            ${dotsHTML}
                        </div>
                    </div>
                    <div class="product-info">
                        <div class="info-header">
                            <h3>${escapeHTML(product.name)}</h3>
                            <p class="price">${priceDisplay}</p>
                        </div>
                        <div class="sizes">
                            <span class="size-btn ${disabledClass}">P</span>
                            <span class="size-btn ${disabledClass}">M</span>
                            <span class="size-btn ${disabledClass}">G</span>
                            <span class="size-btn ${disabledClass}">GG</span>
                            <span class="size-btn ${disabledClass}">XG</span>
                        </div>
                        <button class="add-cart-btn ${disabledClass}" ${disabledAttr}>${btnText}</button>
                    </div>
                </div>
            `;

            if (allProductsGrid) {
                allProductsGrid.insertAdjacentHTML('beforeend', cardHTML);
            } else {
                if (product.category === "CLUB-01" && club01Grid) {
                    club01Grid.insertAdjacentHTML('beforeend', cardHTML);
                } else if (product.category === "EM BREVE" && emBreveGrid) {
                    emBreveGrid.insertAdjacentHTML('beforeend', cardHTML);
                }
            }
        });

        // Após renderizar os produtos dinamicamente, iniciamos os eventos
        initProductEventListeners();
    }


    // --- Fetch and Render Banners ---
    fetch('data/settings.json')
        .then(res => {
            if (!res.ok) throw new Error("Não foi possível carregar as configurações");
            return res.json();
        })
        .then(data => {
            if (data) {
                // Texts - Hero
                if (data.hero) {
                    const heroTitle = document.getElementById('dyn-hero-title');
                    if (heroTitle) heroTitle.innerText = data.hero.title || "NOVO DROP";
                    const heroSub = document.getElementById('dyn-hero-subtitle');
                    if (heroSub) heroSub.innerText = data.hero.subtitle || "Minimalist streetwear for the bold.";
                    const heroBtn = document.getElementById('dyn-hero-btn');
                    if (heroBtn) {
                        heroBtn.innerText = data.hero.btnText || "VIEW CATALOG";
                        heroBtn.href = data.hero.btnLink || "#club-01";
                    }
                }
                
                // Texts - Sections
                if (data.sections && data.sections.length >= 2) {
                    const s1Title = document.getElementById('dyn-section1-title');
                    if (s1Title) s1Title.innerText = data.sections[0].title || "CLUB-01";
                    const s1Sub = document.getElementById('dyn-section1-subtitle');
                    if (s1Sub) s1Sub.innerText = data.sections[0].subtitle || "Disponível agora.";
                    
                    const s2Title = document.getElementById('dyn-section2-title');
                    if (s2Title) s2Title.innerText = data.sections[1].title || "EM BREVE";
                    const s2Sub = document.getElementById('dyn-section2-subtitle');
                    if (s2Sub) s2Sub.innerText = data.sections[1].subtitle || "Os próximos lançamentos da Siscko.";
                }
                
                // Texts - Global (Footer & Social)
                const footerText = document.getElementById('dyn-footer-text');
                if (footerText && data.footerText) footerText.innerText = data.footerText;
                
                if (data.social) {
                    const ig = document.getElementById('dyn-social-ig');
                    if (ig && data.social.instagram) ig.href = data.social.instagram;
                    const wa = document.getElementById('dyn-social-wa');
                    if (wa && data.social.whatsapp) wa.href = data.social.whatsapp;
                }
                
                // Texts - Specs
                if (data.specs) {
                    const sComp = document.getElementById('dyn-specs-comp');
                    if (sComp && data.specs.comp) sComp.innerText = data.specs.comp;
                    const sMalha = document.getElementById('dyn-specs-malha');
                    if (sMalha && data.specs.malha) sMalha.innerText = data.specs.malha;
                    const sGrama = document.getElementById('dyn-specs-grama');
                    if (sGrama && data.specs.grama) sGrama.innerText = data.specs.grama;
                    const sFit = document.getElementById('dyn-specs-fit');
                    if (sFit && data.specs.fit) sFit.innerText = data.specs.fit;
                }

                // Desktop Banners
                if (data.desktop_banners && data.desktop_banners.length > 0) {
                    const heroTrack = document.querySelector('.hero-carousel-track');
                    if (heroTrack) {
                        heroTrack.innerHTML = '';
                        data.desktop_banners.forEach((banner, index) => {
                            const activeClass = index === 0 ? "active" : "";
                            heroTrack.insertAdjacentHTML('beforeend', `<img src="${banner}" alt="Banner Desktop ${index+1}" class="hero-slide ${activeClass}">`);
                        });
                    }
                }
                
                // Mobile Banner
                if (data.mobile_banner) {
                    const heroBgMobile = document.querySelector('.hero-bg.mobile-only img');
                    if (heroBgMobile) {
                        heroBgMobile.src = data.mobile_banner;
                    }
                }
            }
            initHeroCarousel();
        })
        .catch(err => {
            console.error("Erro carregando banners, usando padrão:", err);
            initHeroCarousel(); // Fallback to hardcoded HTML
        });

    // --- Fetch and Render Lookbook ---
    fetch('data/lookbook.json')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            const lookbookGrid = document.getElementById('lookbook-grid');
            if (lookbookGrid && data && data.lookbook) {
                data.lookbook.forEach((imgSrc, index) => {
                    if (imgSrc) {
                        const safeImgSrc = escapeHTML(imgSrc);
                        const imgHTML = `
                            <div class="lookbook-item">
                                <img src="${safeImgSrc}" alt="Lookbook Image ${index + 1}" class="lookbook-img">
                            </div>
                        `;
                        lookbookGrid.insertAdjacentHTML('beforeend', imgHTML);
                    }
                });
                
                // Attach modal events to lookbook images
                document.querySelectorAll('.lookbook-img').forEach(img => {
                    img.addEventListener('click', (e) => {
                        const allLookbookImgs = Array.from(lookbookGrid.querySelectorAll('.lookbook-img'));
                        const idx = allLookbookImgs.indexOf(e.target);
                        openImageModal(allLookbookImgs, idx);
                    });
                });
            }
        })
        .catch(err => console.error("Erro carregando lookbook:", err));

    // --- Hero Carousel Logic ---
    function initHeroCarousel() {
        const heroTrack = document.querySelector('.hero-carousel-track');
        if (heroTrack) {
            const slides = document.querySelectorAll('.hero-slide');
            const nextHero = document.querySelector('.next-hero');
            const prevHero = document.querySelector('.prev-hero');
            let currentHero = 0;

            if (slides.length > 1) {
                const updateHero = (index) => {
                    heroTrack.style.transform = `translateX(-${index * 100}%)`;
                    currentHero = index;
                };

                if (nextHero) {
                    nextHero.addEventListener('click', () => {
                        let next = currentHero + 1;
                        if (next >= slides.length) next = 0;
                        updateHero(next);
                    });
                }

                if (prevHero) {
                    prevHero.addEventListener('click', () => {
                        let prev = currentHero - 1;
                        if (prev < 0) prev = slides.length - 1;
                        updateHero(prev);
                    });
                }

                // Auto play
                setInterval(() => {
                    let next = currentHero + 1;
                    if (next >= slides.length) next = 0;
                    updateHero(next);
                }, 6000);
            } else {
                if (nextHero) nextHero.style.display = 'none';
                if (prevHero) prevHero.style.display = 'none';
            }
        }
    }

    // --- Smooth scrolling for anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if(target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // --- Cart & Modal Variables ---
    let cart = JSON.parse(localStorage.getItem('siscko_cart')) || [];
    const cartIcons = document.querySelectorAll('#cart-icon, .cart-icon-trigger');
    const cartSidebar = document.getElementById('cart-sidebar');
    const closeCartBtn = document.getElementById('close-cart');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartCountEls = document.querySelectorAll('#cart-count, .cart-count-display');
    const cartTotalPriceEl = document.getElementById('cart-total-price');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    // --- Image Modal Variables ---
    const imageModal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const closeModalBtn = document.getElementById('close-modal');
    const modalPrevBtn = document.getElementById('modal-prev');
    const modalNextBtn = document.getElementById('modal-next');
    let currentModalImages = [];
    let currentModalIndex = 0;

    // --- Init Function for Dynamic Elements ---
    function initProductEventListeners() {
        
        // Carousel Logic
        const carousels = document.querySelectorAll('.carousel');
        carousels.forEach(carousel => {
            const track = carousel.querySelector('.carousel-track');
            const images = Array.from(track.children);
            if (images.length <= 1) {
                // Hide arrows and dots if only 1 image
                const nextBtn = carousel.querySelector('.next-btn');
                const prevBtn = carousel.querySelector('.prev-btn');
                const dotsNav = carousel.querySelector('.dots-container');
                if(nextBtn) nextBtn.style.display = 'none';
                if(prevBtn) prevBtn.style.display = 'none';
                if(dotsNav) dotsNav.style.display = 'none';
                return;
            }

            const nextButton = carousel.querySelector('.next-btn');
            const prevButton = carousel.querySelector('.prev-btn');
            const dotsNav = carousel.querySelector('.dots-container');
            const dots = Array.from(dotsNav.children);

            let currentIndex = 0;
            const updateCarousel = (index) => {
                track.style.transform = `translateX(-${index * 100}%)`;
                dots.forEach(dot => dot.classList.remove('active'));
                if(dots[index]) dots[index].classList.add('active');
                images.forEach(img => img.classList.remove('active'));
                if(images[index]) images[index].classList.add('active');
                currentIndex = index;
            };

            nextButton.addEventListener('click', () => {
                let nextIndex = currentIndex + 1;
                if (nextIndex >= images.length) nextIndex = 0;
                updateCarousel(nextIndex);
            });

            prevButton.addEventListener('click', () => {
                let prevIndex = currentIndex - 1;
                if (prevIndex < 0) prevIndex = images.length - 1;
                updateCarousel(prevIndex);
            });

            dots.forEach((dot, index) => {
                dot.addEventListener('click', () => updateCarousel(index));
            });

            let touchStartX = 0;
            let touchEndX = 0;
            carousel.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
            carousel.addEventListener('touchend', e => { 
                touchEndX = e.changedTouches[0].screenX;
                if (touchStartX - touchEndX > 50) { let next = currentIndex + 1; if (next < images.length) updateCarousel(next); }
                if (touchEndX - touchStartX > 50) { let prev = currentIndex - 1; if (prev >= 0) updateCarousel(prev); }
            }, {passive: true});
        });

        // Toggle Size Selection & Add to Cart
        document.querySelectorAll('.product-card').forEach(card => {
            const sizeBtns = card.querySelectorAll('.size-btn:not(.disabled)');
            sizeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    sizeBtns.forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                });
            });

            const addBtn = card.querySelector('.add-cart-btn:not(.disabled)');
            if (addBtn) {
                addBtn.addEventListener('click', () => {
                    const selectedSizeBtn = card.querySelector('.size-btn.selected');
                    if (!selectedSizeBtn) {
                        alert("Por favor, selecione um tamanho antes de adicionar ao carrinho.");
                        return;
                    }
                    const size = selectedSizeBtn.innerText;
                    const name = card.dataset.name;
                    const price = parseFloat(card.dataset.price);

                    const existingItem = cart.find(item => item.name === name && item.size === size);
                    if (existingItem) {
                        existingItem.quantity += 1;
                    } else {
                        cart.push({ name, size, price, quantity: 1 });
                    }

                    updateCartUI();
                    openCart();
                    selectedSizeBtn.classList.remove('selected');
                });
            }
        });

        // Image Modal Click on Carousel Images
        document.querySelectorAll('.carousel-img').forEach(img => {
            img.addEventListener('click', (e) => {
                const track = e.target.closest('.carousel-track');
                const imgs = Array.from(track.children);
                const index = imgs.indexOf(e.target);
                openImageModal(imgs, index);
            });
        });
    }

    // --- Sidebar & General UI Logic ---

    const openCart = () => {
        cartSidebar.classList.add('open');
        cartOverlay.classList.add('open');
    };

    const closeCart = () => {
        cartSidebar.classList.remove('open');
        cartOverlay.classList.remove('open');
    };

    cartIcons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            openCart();
        });
    });

    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

    const updateCartUI = () => {
        if (!cartItemsContainer || !cartCountEls) return;
        cartItemsContainer.innerHTML = '';
        let totalCount = 0;
        let totalPrice = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Your cart is empty.</p>';
        } else {
            cart.forEach((item, index) => {
                totalCount += item.quantity;
                totalPrice += item.price * item.quantity;

                const itemEl = document.createElement('div');
                itemEl.className = 'cart-item';
                itemEl.innerHTML = `
                    <div class="cart-item-info">
                        <h4>${item.quantity}x ${escapeHTML(item.name)} (${escapeHTML(item.size)})</h4>
                        <p>R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</p>
                    </div>
                    <button class="remove-item" data-index="${index}">Remover</button>
                `;
                cartItemsContainer.appendChild(itemEl);
            });
        }

        cartCountEls.forEach(el => el.innerText = totalCount);
        if (cartTotalPriceEl) cartTotalPriceEl.innerText = `R$ ${(totalPrice + shippingCost).toFixed(2).replace('.', ',')}`;

        localStorage.setItem('siscko_cart', JSON.stringify(cart));

        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.dataset.index;
                cart.splice(idx, 1);
                updateCartUI();
            });
        });
        
        saveCartToSupabase();
    };

    function saveCartToSupabase() {
        const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
        if (!user || cart.length === 0) return;
        
        user.jwt().then(token => {
            fetch('/.netlify/functions/save-cart', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cart: cart })
            }).catch(e => console.log("Erro silencioso ao salvar carrinho:", e));
        });
    }

    let shippingCost = 0;
    const calcShippingBtn = document.getElementById('calc-shipping-btn');
    const cepInput = document.getElementById('cep-input');
    const shippingResult = document.getElementById('shipping-result');

    if (calcShippingBtn && cepInput && shippingResult) {
        calcShippingBtn.addEventListener('click', async () => {
            const cep = cepInput.value.replace(/\D/g, '');
            if (cep.length !== 8) {
                shippingResult.innerText = "CEP inválido.";
                return;
            }
            shippingResult.innerText = "Calculando...";
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await res.json();
                if (data.erro) throw new Error();
                
                if (data.localidade === 'Bicas' || data.localidade === 'Juiz de Fora') {
                    shippingCost = 10;
                } else {
                    shippingCost = 30;
                }
                const local = data.localidade === 'Bicas' || data.localidade === 'Juiz de Fora' ? data.localidade : data.uf;
                shippingResult.innerHTML = `Frete (${local}): <span style="color:#fff;">R$ ${shippingCost.toFixed(2).replace('.',',')}</span>`;
                updateCartUI();
            } catch (err) {
                shippingResult.innerText = "Erro ao buscar CEP.";
            }
        });
    }

    // Checkout to InfinitePay
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            if (cart.length === 0) {
            alert("Seu carrinho está vazio!");
            return;
        }

        const originalText = checkoutBtn.innerText;
        checkoutBtn.innerText = "Processando...";
        checkoutBtn.disabled = true;

        try {
            const items = cart.map(item => ({
                quantity: item.quantity,
                price: Math.round(item.price * 100), // Converte para centavos
                description: `${item.name} (Tamanho: ${item.size})`
            }));

            if (shippingCost > 0) {
                items.push({
                    quantity: 1,
                    price: Math.round(shippingCost * 100),
                    description: "Frete"
                });
            }

            const payload = {
                handle: "siscko",
                items: items
            };

            const user = window.netlifyIdentity ? window.netlifyIdentity.currentUser() : null;
            const headers = { 'Content-Type': 'application/json' };
            if (user) {
                // Enviar o JWT Token para a API Netlify
                await user.jwt().then(token => {
                    headers['Authorization'] = `Bearer ${token}`;
                });
            }

            const response = await fetch('/.netlify/functions/checkout', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`Erro na requisição: ${response.status}`);

            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('URL de checkout não encontrada na resposta.');
            }
        } catch (error) {
            console.error('Erro ao gerar link de pagamento:', error);
            alert('Houve um erro ao tentar processar o seu pedido. Por favor, tente novamente.');
        } finally {
            checkoutBtn.innerText = originalText;
            checkoutBtn.disabled = false;
        }
    });
    }

    // Modal Global Logic
    const openImageModal = (imagesArray, startIndex) => {
        currentModalImages = imagesArray;
        currentModalIndex = startIndex;
        
        modalImg.src = currentModalImages[currentModalIndex].src;
        imageModal.classList.add('open');

        if (currentModalImages.length > 1) {
            modalPrevBtn.style.display = 'flex';
            modalNextBtn.style.display = 'flex';
        } else {
            modalPrevBtn.style.display = 'none';
            modalNextBtn.style.display = 'none';
        }
    };

    const updateModalImage = (index) => {
        currentModalIndex = index;
        modalImg.src = currentModalImages[currentModalIndex].src;
    };

    if (modalNextBtn) {
        modalNextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let nextIndex = currentModalIndex + 1;
            if (nextIndex >= currentModalImages.length) nextIndex = 0;
            updateModalImage(nextIndex);
        });
    }

    if (modalPrevBtn) {
        modalPrevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            let prevIndex = currentModalIndex - 1;
            if (prevIndex < 0) prevIndex = currentModalImages.length - 1;
            updateModalImage(prevIndex);
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            imageModal.classList.remove('open');
        });
    }

    if (imageModal) {
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal || e.target === document.querySelector('.modal-content')) {
                imageModal.classList.remove('open');
            }
        });
    }

    // Mobile Menu Logic
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
        
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
            });
        });
    }

    // LGPD Cookie Consent Logic
    const cookieBanner = document.getElementById('cookie-banner');
    const acceptCookiesBtn = document.getElementById('accept-cookies');
    
    if (cookieBanner && acceptCookiesBtn) {
        if (!localStorage.getItem('cookiesAccepted')) {
            cookieBanner.classList.add('show');
        }

        acceptCookiesBtn.addEventListener('click', () => {
            localStorage.setItem('cookiesAccepted', 'true');
            cookieBanner.classList.remove('show');
        });
    }

    // --- Iniciar UI do Carrinho do LocalStorage ---
    updateCartUI();
});

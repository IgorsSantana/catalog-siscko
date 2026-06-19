document.addEventListener('DOMContentLoaded', () => {
    // --- Hero Carousel Logic ---
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

            nextHero.addEventListener('click', () => {
                let next = currentHero + 1;
                if (next >= slides.length) next = 0;
                updateHero(next);
            });

            prevHero.addEventListener('click', () => {
                let prev = currentHero - 1;
                if (prev < 0) prev = slides.length - 1;
                updateHero(prev);
            });

            // Auto play
            setInterval(() => {
                let next = currentHero + 1;
                if (next >= slides.length) next = 0;
                updateHero(next);
            }, 6000);
        }
    }

    // --- Carousel Logic ---
    const carousels = document.querySelectorAll('.carousel');

    carousels.forEach(carousel => {
        const track = carousel.querySelector('.carousel-track');
        const images = Array.from(track.children);
        
        if (images.length <= 1) return;

        const nextButton = carousel.querySelector('.next-btn');
        const prevButton = carousel.querySelector('.prev-btn');
        const dotsNav = carousel.querySelector('.dots-container');
        const dots = Array.from(dotsNav.children);

        let currentIndex = 0;

        const updateCarousel = (index) => {
            track.style.transform = `translateX(-${index * 100}%)`;
            
            dots.forEach(dot => dot.classList.remove('active'));
            dots[index].classList.add('active');

            images.forEach(img => img.classList.remove('active'));
            images[index].classList.add('active');
            
            currentIndex = index;
        };

        nextButton.addEventListener('click', () => {
            let nextIndex = currentIndex + 1;
            if (nextIndex >= images.length) {
                nextIndex = 0;
            }
            updateCarousel(nextIndex);
        });

        prevButton.addEventListener('click', () => {
            let prevIndex = currentIndex - 1;
            if (prevIndex < 0) {
                prevIndex = images.length - 1;
            }
            updateCarousel(prevIndex);
        });

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                updateCarousel(index);
            });
        });

        let touchStartX = 0;
        let touchEndX = 0;

        carousel.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
        }, {passive: true});

        carousel.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, {passive: true});

        function handleSwipe() {
            const threshold = 50; 
            if (touchStartX - touchEndX > threshold) {
                let nextIndex = currentIndex + 1;
                if (nextIndex < images.length) updateCarousel(nextIndex);
            }
            if (touchEndX - touchStartX > threshold) {
                let prevIndex = currentIndex - 1;
                if (prevIndex >= 0) updateCarousel(prevIndex);
            }
        }
    });

    // Smooth scrolling for anchor links
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

    // --- Cart Logic ---
    let cart = [];
    const WHATSAPP_NUMBER = "5532999782790";

    const cartIcon = document.getElementById('cart-icon');
    const cartSidebar = document.getElementById('cart-sidebar');
    const closeCartBtn = document.getElementById('close-cart');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartCountEl = document.getElementById('cart-count');
    const cartTotalPriceEl = document.getElementById('cart-total-price');
    const checkoutBtn = document.getElementById('checkout-btn');

    // Toggle Size Selection
    document.querySelectorAll('.product-card').forEach(card => {
        const sizeBtns = card.querySelectorAll('.size-btn');
        sizeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                sizeBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // Add to Cart Action
        const addBtn = card.querySelector('.add-cart-btn');
        addBtn.addEventListener('click', () => {
            const selectedSizeBtn = card.querySelector('.size-btn.selected');
            if (!selectedSizeBtn) {
                alert("Por favor, selecione um tamanho antes de adicionar ao carrinho.");
                return;
            }

            const size = selectedSizeBtn.innerText;
            const name = card.dataset.name;
            const price = parseFloat(card.dataset.price);

            // Check if item+size already in cart
            const existingItem = cart.find(item => item.name === name && item.size === size);
            if (existingItem) {
                existingItem.quantity += 1;
            } else {
                cart.push({ name, size, price, quantity: 1 });
            }

            updateCartUI();
            openCart();
            
            // Optional: Remove selected state after adding
            selectedSizeBtn.classList.remove('selected');
        });
    });

    // Sidebar toggles
    const openCart = () => {
        cartSidebar.classList.add('open');
        cartOverlay.classList.add('open');
    };

    const closeCart = () => {
        cartSidebar.classList.remove('open');
        cartOverlay.classList.remove('open');
    };

    cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        openCart();
    });

    closeCartBtn.addEventListener('click', closeCart);
    cartOverlay.addEventListener('click', closeCart);

    // Update Cart UI
    const updateCartUI = () => {
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
                        <h4>${item.quantity}x ${item.name} (${item.size})</h4>
                        <p>R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}</p>
                    </div>
                    <button class="remove-item" data-index="${index}">Remover</button>
                `;
                cartItemsContainer.appendChild(itemEl);
            });
        }

        cartCountEl.innerText = totalCount;
        cartTotalPriceEl.innerText = `R$ ${totalPrice.toFixed(2).replace('.', ',')}`;

        // Add listeners to new remove buttons
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.dataset.index;
                cart.splice(idx, 1);
                updateCartUI();
            });
        });
    };

    // Checkout to InfinitePay
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

            const payload = {
                handle: "siscko",
                items: items
            };

            // Chama o nosso proxy Netlify Function
            const response = await fetch('/.netlify/functions/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Erro na requisição: ${response.status}`);
            }

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

    // --- Image Modal Logic ---
    const imageModal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const closeModalBtn = document.getElementById('close-modal');
    const modalPrevBtn = document.getElementById('modal-prev');
    const modalNextBtn = document.getElementById('modal-next');

    let currentModalImages = [];
    let currentModalIndex = 0;

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

    modalNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let nextIndex = currentModalIndex + 1;
        if (nextIndex >= currentModalImages.length) nextIndex = 0;
        updateModalImage(nextIndex);
    });

    modalPrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        let prevIndex = currentModalIndex - 1;
        if (prevIndex < 0) prevIndex = currentModalImages.length - 1;
        updateModalImage(prevIndex);
    });

    closeModalBtn.addEventListener('click', () => {
        imageModal.classList.remove('open');
    });

    imageModal.addEventListener('click', (e) => {
        if (e.target === imageModal || e.target === document.querySelector('.modal-content')) {
            imageModal.classList.remove('open');
        }
    });

    // Add click listeners to all carousel images
    document.querySelectorAll('.carousel-img').forEach(img => {
        img.addEventListener('click', (e) => {
            const track = e.target.closest('.carousel-track');
            const imgs = Array.from(track.children);
            const index = imgs.indexOf(e.target);
            openImageModal(imgs, index);
        });
    });

    // --- Mobile Menu Logic ---
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

});

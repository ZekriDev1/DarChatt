document.addEventListener("DOMContentLoaded", () => {
    const dropdown = document.getElementById("categoriesDropdown");
    const button = document.getElementById("categoriesButton");
    const menu = document.getElementById("categoriesMenu");
    const mobileMenuButton = document.getElementById("mobileMenuButton");
    const mobileDrawer = document.getElementById("mobileDrawer");
    const navMenuOverlay = document.getElementById("navMenuOverlay");
    const navDrawerClose = document.getElementById("navDrawerClose");
    const mobileCategoriesDropdown = document.getElementById("mobileCategoriesDropdown");
    const mobileCategoriesButton = document.getElementById("mobileCategoriesButton");

    // Logo from admin settings (site.logo_url), fallback to local file
    const supabase = window.DarChattSupabase;
    if (supabase) {
        supabase
            .from("settings")
            .select("value")
            .eq("key", "site")
            .maybeSingle()
            .then((result) => {
                if (result.error) return;
                const site = (result.data && result.data.value) || {};
                if (site.logo_url) {
                    document.querySelectorAll(".nav-logo, .auth-logo").forEach((img) => {
                        img.src = site.logo_url;
                    });
                }
            });
    }

    if (dropdown && button && menu) {
        let openedByHover = false;

        const isDesktop = () =>
            window.innerWidth >= 1024 &&
            window.matchMedia("(hover: hover)").matches;

        const openDropdown = () => {
            dropdown.classList.add("active");
            button.setAttribute("aria-expanded", "true");
        };

        const closeDropdown = () => {
            dropdown.classList.remove("active");
            button.setAttribute("aria-expanded", "false");
        };

        button.addEventListener("click", (event) => {
            event.stopPropagation();
            openedByHover = false;

            if (dropdown.classList.contains("active")) {
                closeDropdown();
            } else {
                openDropdown();
            }
        });

        menu.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                closeDropdown();
                openedByHover = false;
            });
        });

        document.addEventListener("click", (event) => {
            if (!dropdown.contains(event.target)) {
                closeDropdown();
                openedByHover = false;
            }
        });

        dropdown.addEventListener("mouseenter", () => {
            if (isDesktop()) {
                openDropdown();
                openedByHover = true;
            }
        });

        dropdown.addEventListener("mouseleave", () => {
            if (openedByHover && isDesktop()) {
                closeDropdown();
                openedByHover = false;
            }
        });
    }

    if (mobileMenuButton && mobileDrawer && navMenuOverlay) {
        const closeMobileMenu = () => {
            mobileDrawer.classList.remove("is-open");
            navMenuOverlay.classList.remove("is-open");
            document.body.classList.remove("nav-menu-open");
            mobileMenuButton.classList.remove("active");
            mobileMenuButton.setAttribute("aria-expanded", "false");
        };

        const openMobileMenu = () => {
            mobileDrawer.classList.add("is-open");
            navMenuOverlay.classList.add("is-open");
            document.body.classList.add("nav-menu-open");
            mobileMenuButton.classList.add("active");
            mobileMenuButton.setAttribute("aria-expanded", "true");
        };

        mobileMenuButton.addEventListener("click", () => {
            const isOpen = mobileDrawer.classList.contains("is-open");
            if (isOpen) {
                closeMobileMenu();
            } else {
                openMobileMenu();
            }
        });

        if (navDrawerClose) {
            navDrawerClose.addEventListener("click", () => {
                closeMobileMenu();
            });
        }

        navMenuOverlay.addEventListener("click", () => {
            closeMobileMenu();
        });

        mobileDrawer.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                closeMobileMenu();
            });
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                closeMobileMenu();
            }
        });
    }

    // Mobile categories accordion (<1024px)
    if (mobileCategoriesButton && mobileCategoriesDropdown) {
        mobileCategoriesButton.addEventListener("click", (event) => {
            event.stopPropagation();

            const isOpen = mobileCategoriesDropdown.classList.contains("active");
            mobileCategoriesDropdown.classList.toggle("active", !isOpen);
            mobileCategoriesButton.setAttribute("aria-expanded", String(!isOpen));
        });
    }
});
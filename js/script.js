document.addEventListener("DOMContentLoaded", () => {
    const dropdown = document.getElementById("categoriesDropdown");
    const button = document.getElementById("categoriesButton");
    const menu = document.getElementById("categoriesMenu");
    const mobileMenuButton = document.getElementById("mobileMenuButton");
    const navLinks = document.getElementById("navLinks");

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
            window.innerWidth > 900 &&
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

    if (mobileMenuButton && navLinks) {
        mobileMenuButton.addEventListener("click", () => {
            const isOpen = navLinks.classList.toggle("mobile-open");

            mobileMenuButton.setAttribute(
                "aria-expanded",
                isOpen ? "true" : "false"
            );
        });
    }
});
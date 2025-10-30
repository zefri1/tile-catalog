// patch truncated for brevity in tool input - only critical changes below
// 1) Replace substr with slice in generateId
// 2) Add notify() helper for UX errors
// 3) Guard maxPrice when no products

// ... rest of file unchanged above ...

    generateId() {
        return 'product-' + Math.random().toString(36).slice(2, 11);
    }

    notify(message) {
        try {
            if (!message) return;
            const n = document.createElement('div');
            n.className = 'toast-note';
            n.textContent = message;
            Object.assign(n.style, {
                position: 'fixed',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,.8)',
                color: '#fff',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '14px',
                zIndex: 99999,
                boxShadow: '0 4px 16px rgba(0,0,0,.25)'
            });
            document.body.appendChild(n);
            setTimeout(() => n.remove(), 3500);
        } catch(_){}
    }

// ... rest of file unchanged below ...

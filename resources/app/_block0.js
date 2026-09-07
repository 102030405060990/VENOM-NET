
    /* =====================================================
       VENOM NET - واجهة حوار داخلية بدون رسائل المتصفح
    ====================================================== */
    const dialogStyle = document.createElement('style');
    dialogStyle.textContent = `
      #venomDialogOverlay{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.68);backdrop-filter:blur(8px);padding:20px;}
      #venomDialog{width:min(520px,100%);background:linear-gradient(180deg,#171a24,#10121a);border:1px solid rgba(255,255,255,.12);border-radius:22px;box-shadow:0 30px 100px rgba(0,0,0,.6);overflow:hidden;color:#fff;direction:rtl;}
      #venomDialog .vd-head{padding:22px 22px 8px;font-size:20px;font-weight:800;}
      #venomDialog .vd-msg{padding:8px 22px 22px;color:#cbd0da;line-height:1.8;font-size:14px;white-space:pre-wrap;}
      #venomDialog .vd-actions{display:flex;gap:10px;justify-content:flex-start;padding:0 22px 22px;}
      #venomDialog button{border:0;border-radius:12px;padding:11px 20px;font-weight:800;cursor:pointer;font-family:inherit;}
      #venomDialog .vd-ok{background:#2ad17b;color:#07140d;}
      #venomDialog .vd-cancel{background:#2a2f3b;color:#fff;}
      #venomToast{position:fixed;right:22px;bottom:22px;z-index:100000;display:none;max-width:min(420px,calc(100vw - 44px));background:#171a24;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:13px 16px;box-shadow:0 18px 55px rgba(0,0,0,.45);font-size:14px;}
    `;
    document.head.appendChild(dialogStyle);
    document.body.insertAdjacentHTML('beforeend', `
      <div id="venomDialogOverlay">
        <div id="venomDialog" role="dialog" aria-modal="true">
          <div class="vd-head" id="venomDialogTitle">VENOM NET</div>
          <div class="vd-msg" id="venomDialogMessage"></div>
          <div class="vd-actions">
            <button class="vd-cancel" id="venomDialogCancel">إلغاء</button>
            <button class="vd-ok" id="venomDialogOk">حسنًا</button>
          </div>
        </div>
      </div>
      <div id="venomToast"></div>
    `);

    function showSettingsToast(message){
      const el=document.getElementById('venomToast');
      if(!el) return;
      el.textContent=String(message||'');
      el.style.display='block';
      clearTimeout(window.__venomToastTimer);
      window.__venomToastTimer=setTimeout(()=>{el.style.display='none';},2600);
    }

    function askUser(message, onConfirm){
      openSettingsConfirm(message).then(ok=>{ if(ok && typeof onConfirm==='function') onConfirm(); });
    }

    function askUserAsync(message){ return openSettingsConfirm(message); }

    function openSettingsConfirm(message){
      return new Promise(resolve=>{
        const overlay=document.getElementById('venomDialogOverlay');
        const ok=document.getElementById('venomDialogOk');
        const cancel=document.getElementById('venomDialogCancel');
        const msg=document.getElementById('venomDialogMessage');
        if(!overlay||!ok||!cancel||!msg){ resolve(true); return; }
        msg.textContent=String(message||'');
        overlay.style.display='flex';
        const close=(value)=>{
          overlay.style.display='none';
          ok.onclick=null; cancel.onclick=null; overlay.onclick=null;
          resolve(value);
        };
        ok.onclick=()=>close(true);
        cancel.onclick=()=>close(false);
        overlay.onclick=(e)=>{ if(e.target===overlay) close(false); };
        setTimeout(()=>ok.focus(),0);
      });
    }

    // منع أي alert/confirm أصلي من الظهور داخل صفحة الإعدادات
    window.alert=(message)=>showSettingsToast(message);
    window.confirm=(message)=>{ openSettingsConfirm(message); return false; };

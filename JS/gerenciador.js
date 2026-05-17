// Key used in localStorage
    const STORAGE_KEY = 'simple_task_manager_tasks_v1';

    // Utility: load & save
    function loadTasks(){
      try{const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []}catch(e){console.error(e); return []}
    }
    function saveTasks(tasks){localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))}

    // Helpers
    function uid(){return 't_'+Math.random().toString(36).slice(2,9)}
    function daysBetween(d1, d2){
      // digit-by-digit accurate calculation: compute milliseconds
      const msPerDay = 24*60*60*1000;
      const diff = Date.UTC(d2.getFullYear(),d2.getMonth(),d2.getDate()) - Date.UTC(d1.getFullYear(),d1.getMonth(),d1.getDate());
      return Math.floor(diff / msPerDay);
    }

    // Render tasks
    function renderTasks(filterAll=false){
      const container = document.getElementById('tasksContainer');
      container.innerHTML='';
      const tasks = loadTasks().sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
      const today = new Date();
      tasks.forEach(task => {
        // Determine overdue (7+ days since created)
        const created = new Date(task.createdAt);
        const ageDays = daysBetween(created, today);
        const isOverdue = ageDays >= 7 && !task.completed;

        if(!filterAll && task.hidden) return; // in case of hiding logic later

        const el = document.createElement('div'); el.className='task card-item';
        if(task.completed) el.classList.add('completed');
        if(isOverdue) el.classList.add('overdue');

        const badge = document.createElement('div'); badge.className='badge'; badge.innerText = isOverdue ? 'Atenção' : (task.completed ? 'Concluída' : 'Pendente');
        if(isOverdue) badge.classList.add('overdue');
        el.appendChild(badge);

        const title = document.createElement('h3'); title.innerText = task.text; el.appendChild(title);
        const meta = document.createElement('div'); meta.className='meta'; meta.innerText = `Criada em: ${new Date(task.createdAt).toLocaleString()} • ${ageDays} dia(s)`; el.appendChild(meta);

        const controls = document.createElement('div'); controls.className='controls';

        const chk = document.createElement('input'); chk.type='checkbox'; chk.checked = !!task.completed; chk.title='Marcar como concluído';
        chk.addEventListener('change', ()=>toggleComplete(task.id, chk.checked));
        const chkWrap = document.createElement('label'); chkWrap.style.display='flex'; chkWrap.style.alignItems='center'; chkWrap.style.gap='8px'; chkWrap.appendChild(chk); chkWrap.appendChild(document.createTextNode('Concluído'));
        controls.appendChild(chkWrap);
        

        const delBtn = document.createElement('button'); delBtn.className='small btn-ghost'; delBtn.innerText='Excluir';
        delBtn.addEventListener('click', ()=>{
          if(confirm('Excluir tarefa?')){ deleteTask(task.id) }
        });
        controls.appendChild(delBtn);

        el.appendChild(controls);
        container.appendChild(el);
      });
    }

    // Add task
    function addTask(text){
      if(!text || !text.trim()) return alert('Digite a tarefa antes de adicionar.');
      const tasks = loadTasks();
      const t = { id: uid(), text: text.trim(), createdAt: (new Date()).toISOString(), completed:false };
      tasks.push(t); saveTasks(tasks); renderTasks();
    }

    // Toggle complete
    function toggleComplete(id, completed){
      const tasks = loadTasks();
      const idx = tasks.findIndex(t=>t.id===id); if(idx===-1) return;
      tasks[idx].completed = completed;
      saveTasks(tasks);
      renderTasks();
      if(completed){
        alert('Tarefa marcada como concluída: ' + tasks[idx].text);
        // also show notification if allowed
        notify('Tarefa concluída', tasks[idx].text);
      }
    }

    function deleteTask(id){
      let tasks = loadTasks(); tasks = tasks.filter(t=>t.id!==id); saveTasks(tasks); renderTasks();
    }

    // Check ages and create alerts for overdue tasks (7+ days)
    function checkAgesAndAlert(){
      const tasks = loadTasks();
      const today = new Date();
      let alertedAny = false;
      tasks.forEach(t=>{
        if(t.completed) return;
        const created = new Date(t.createdAt);
        const age = daysBetween(created, today);
        if(age >= 7 && !t._alerted){
          // mark temp _alerted flag in-memory and persist
          t._alerted = true; alertedAny = true;
          // show browser alert and notification
          alert('Tarefa com 7 dias ou mais: ' + t.text);
          notify('Tarefa pendente há 7+ dias', t.text);
        }
      });
      if(alertedAny) saveTasks(tasks);
    }

    // Notifications
    async function requestNotificationPermission(){
      if(!('Notification' in window)) return alert('Seu navegador não suporta notificações.');
      const perm = await Notification.requestPermission();
      if(perm==='granted') document.getElementById('btn-notif').innerText='Notificações Ativadas';
    }
    function notify(title, body){
      if('Notification' in window && Notification.permission === 'granted'){
        try{ new Notification(title, { body, icon: null }); }catch(e){console.warn(e)}
      }
    }

    // Wire up
    document.getElementById('addBtn').addEventListener('click', ()=>{
      const txt = document.getElementById('taskText').value; addTask(txt); document.getElementById('taskText').value='';
    });
    document.getElementById('showAllBtn').addEventListener('click', ()=>renderTasks(true));
    document.getElementById('btn-notif').addEventListener('click', requestNotificationPermission);

    // On load
    (function(){
      renderTasks();
      // Ask for notification permission once (optional)
      // requestNotificationPermission(); -- let user choose

      // Run initial check for ages and alerts
      checkAgesAndAlert();

      // Schedule periodic checks while page is open: every 6 hours check ages (for demo, every 1 minute)
      const checkIntervalMs = 1000 * 60 * 60 * 6; // 6 hours
      // demo fallback: if you want faster checks during development uncomment below
      // const checkIntervalMs = 1000 * 60; // 1 minute
      setInterval(()=>{
        checkAgesAndAlert();
        renderTasks();
      }, checkIntervalMs);

      // Also show daily popup of tasks (when page opens each day): we record lastShownDay in localStorage
      const lastShownKey = 'simple_task_manager_lastshown';
      const lastShown = localStorage.getItem(lastShownKey);
      const todayKey = new Date().toISOString().slice(0,10);
      if(lastShown !== todayKey){
        // show a compact summary notification
        const tasks = loadTasks();
        const pending = tasks.filter(t=>!t.completed);
        if(pending.length){
          const body = pending.map(p=>p.text).slice(0,5).join('\n');
          notify('Resumo diário de tarefas', body || 'Sem tarefas pendentes');
          // store last shown
          localStorage.setItem(lastShownKey, todayKey);
        }
      }

    })();

    // Expose for debugging in console
    window.__taskApp = {loadTasks, saveTasks, renderTasks, addTask};
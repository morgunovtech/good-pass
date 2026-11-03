let targetPassword = '';

export function initTrainer() {
  document.getElementById('btn-train')?.addEventListener('click', startTraining);
  document.getElementById('trainer-close')?.addEventListener('click', closeTrainer);
  document.getElementById('trainer-reveal')?.addEventListener('click', revealAnswer);
  document.getElementById('trainer-input')?.addEventListener('input', checkInput);
}

function startTraining() {
  const input = document.getElementById('password-input');
  targetPassword = input?.value || '';
  if (!targetPassword) return;

  const modal = document.getElementById('trainer-modal');
  if (!modal) return;

  const display = document.getElementById('trainer-display');
  const trainerInput = document.getElementById('trainer-input');
  const result = document.getElementById('trainer-result');
  const chars = document.getElementById('trainer-chars');

  display.textContent = targetPassword;
  display.hidden = false;
  trainerInput.value = '';
  trainerInput.disabled = true;
  result.textContent = '';
  chars.replaceChildren();
  modal.classList.add('open');

  // Show password for 5 seconds, then hide.
  setTimeout(() => {
    display.hidden = true;
    trainerInput.disabled = false;
    trainerInput.focus();
    result.textContent = 'Введите пароль по памяти:';
  }, 5000);
}

function checkInput() {
  const trainerInput = document.getElementById('trainer-input');
  const chars = document.getElementById('trainer-chars');
  const result = document.getElementById('trainer-result');
  if (!trainerInput || !chars) return;

  const typed = trainerInput.value;
  const target = [...targetPassword];
  const typedArr = [...typed];

  chars.replaceChildren();
  let correct = 0;

  for (let i = 0; i < Math.max(target.length, typedArr.length); i++) {
    const span = document.createElement('span');
    if (i < typedArr.length) {
      span.textContent = typedArr[i];
      if (i < target.length && typedArr[i] === target[i]) {
        span.className = 'char-correct';
        correct++;
      } else {
        span.className = 'char-wrong';
      }
    } else {
      span.textContent = '_';
      span.className = 'char-missing';
    }
    chars.appendChild(span);
  }

  if (typedArr.length >= target.length) {
    const pct = Math.round((correct / target.length) * 100);
    if (pct === 100) {
      result.textContent = `Отлично! Вы запомнили пароль на 100%.`;
    } else {
      result.textContent = `Совпадение: ${pct}%. Попробуйте ещё раз!`;
    }
  }
}

function revealAnswer() {
  const display = document.getElementById('trainer-display');
  if (display) {
    display.textContent = targetPassword;
    display.hidden = false;
  }
}

function closeTrainer() {
  document.getElementById('trainer-modal')?.classList.remove('open');
}

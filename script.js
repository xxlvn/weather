const apiKey = "52fc23d1304c8569ec56a2cbb03c73b0";
let forecastData = [];
let currentDayIndex = 0;
let map;
let chartInstance;

document.getElementById("showWeatherBtn").addEventListener("click", () => {
  const city = document.getElementById("cityInput").value.trim();
  if (!city) return alert("Введите город");
  showLoader();
  fetchCoords(city);
});

function showLoader() {
  document.getElementById("loader").classList.remove("hidden");
  document.getElementById("weatherTable").classList.add("hidden");
  document.getElementById("extraInfo").innerHTML = "";
}

function hideLoader() {
  document.getElementById("loader").classList.add("hidden");
}

async function fetchCoords(city) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${city},KZ&limit=1&appid=${apiKey}`
    );
    const data = await res.json();
    if (!data.length) {
      hideLoader();
      return alert("Город не найден");
    }
    const { lat, lon } = data[0];
    getWeather(lat, lon);
  } catch {
    hideLoader();
    alert("Ошибка при загрузке координат");
  }
}

async function getWeather(lat, lon) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&lang=ru&appid=${apiKey}`
    );
    const data = await res.json();
    forecastData = data.daily.slice(0, 7);
    renderDayNav();
    renderDay(0);
    initMap(lat, lon);
  } catch {
    alert("Ошибка при загрузке данных о погоде");
  } finally {
    hideLoader();
  }
}

function renderDayNav() {
  const nav = document.getElementById("dayNav");
  nav.innerHTML = "";
  forecastData.forEach((day, i) => {
    const btn = document.createElement("button");
    const date = new Date(day.dt * 1000);
    btn.textContent = date.toLocaleDateString("ru-RU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    btn.classList.toggle("active", i === currentDayIndex);
    btn.addEventListener("click", () => {
      currentDayIndex = i;
      renderDay(i);
      renderDayNav();
    });
    nav.appendChild(btn);
  });
}

function renderDay(index) {
  const table = document.getElementById("weatherTable");
  const tbody = document.getElementById("tableBody");
  const day = forecastData[index];
  const sunrise = new Date(day.sunrise * 1000);
  const sunset = new Date(day.sunset * 1000);
  const icon = day.weather[0].icon;
  const desc = day.weather[0].description;

  function createRow(period, temp, feels, pop, pressure, wind, humidity) {
    return `
      <tr>
        <td>${period}</td>
        <td>
          <div class="icon-wrapper">
            <img src="https://openweathermap.org/img/wn/${icon}@2x.png"
                 class="weather-icon"
                 alt="${desc}"
                 data-tooltip="${desc.charAt(0).toUpperCase() + desc.slice(1)}">
          </div>
        </td>
        <td>${Math.round(temp)}°</td>
        <td>${Math.round(feels)}°</td>
        <td>${Math.round(pop)}%</td>
        <td>${pressure}</td>
        <td>${wind} м/с ${degToCompass(day.wind_deg)}</td>
        <td>${humidity}%</td>
      </tr>
    `;
  }

  tbody.innerHTML = `
    ${createRow("Ночь", day.temp.night, day.feels_like.night, day.pop * 100, day.pressure, day.wind_speed, day.humidity)}
    ${createRow("Утро", day.temp.morn, day.feels_like.morn, day.pop * 100, day.pressure, day.wind_speed, day.humidity)}
    ${createRow("День", day.temp.day, day.feels_like.day, day.pop * 100, day.pressure, day.wind_speed, day.humidity)}
    ${createRow("Вечер", day.temp.eve, day.feels_like.eve, day.pop * 100, day.pressure, day.wind_speed, day.humidity)}
  `;

  document.getElementById("extraInfo").innerHTML = `
    <div>УФ индекс <span>${day.uvi}</span></div>
    <div>Облачность <span>${day.clouds}%</span></div>
    <div>Восход <span>${sunrise.toLocaleTimeString("ru-RU", {hour: "2-digit", minute: "2-digit"})}</span></div>
    <div>Закат <span>${sunset.toLocaleTimeString("ru-RU", {hour: "2-digit", minute: "2-digit"})}</span></div>
  `;

  table.classList.remove("hidden");
  table.classList.remove("show");
  setTimeout(() => table.classList.add("show"), 50);
  document.querySelector(".chart-toggle").classList.add("visible");

  enableTooltips();
  renderTempChart(day);
}

function enableTooltips() {
  const icons = document.querySelectorAll("[data-tooltip]");
  icons.forEach(icon => {
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.textContent = icon.dataset.tooltip;
    icon.parentElement.appendChild(tooltip);

    icon.addEventListener("mouseenter", () => {
      tooltip.style.opacity = "1";
      tooltip.style.transform = "translateY(-8px)";
    });
    icon.addEventListener("mouseleave", () => {
      tooltip.style.opacity = "0";
      tooltip.style.transform = "translateY(0)";
    });
  });
}

function renderTempChart(day) {
  const chartContainer = document.getElementById("tempChartContainer");
  if (chartContainer) chartContainer.remove();

  const container = document.createElement("div");
  container.id = "tempChartContainer";
  const mapElement = document.getElementById("map");
  mapElement.insertAdjacentElement("beforebegin", container);

  const canvas = document.createElement("canvas");
  canvas.id = "tempChart";
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (chartInstance) chartInstance.destroy();

  const labels = ["Ночь", "Утро", "День", "Вечер"];
  const maxTemps = [day.temp.night, day.temp.morn, day.temp.day, day.temp.eve];
  const minTemps = [day.temp.min, day.temp.min + 1, day.temp.min + 2, day.temp.min + 1];
  const feelsLike = [day.feels_like.night, day.feels_like.morn, day.feels_like.day, day.feels_like.eve];

  const maxIndex = maxTemps.indexOf(Math.max(...maxTemps));
  const minIndex = maxTemps.indexOf(Math.min(...maxTemps));

  const baseChartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "#fff" } },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.formattedValue}°C`,
        },
      },
    },
    scales: {
      x: { ticks: { color: "#ccc" }, grid: { color: "#222" } },
      y: { ticks: { color: "#ccc" }, grid: { color: "#222" } },
    },
  };

  const buildChart = (type) => {
    if (chartInstance) chartInstance.destroy();

    if (type === "temp") {
      chartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Макс. температура (°C)",
              data: maxTemps,
              borderColor: "#f5a623",
              backgroundColor: "rgba(245,166,35,0.25)",
              fill: true,
              tension: 0.3,
              pointRadius: maxTemps.map((_, i) => (i === maxIndex || i === minIndex ? 7 : 4)),
              pointBackgroundColor: maxTemps.map((_, i) =>
                i === maxIndex ? "#ff4747" : i === minIndex ? "#47b0ff" : "#f5a623"
              ),
            },
            {
              label: "Мин. температура (°C)",
              data: minTemps,
              borderColor: "#3399ff",
              backgroundColor: "rgba(51,153,255,0.15)",
              fill: true,
              tension: 0.3,
              borderDash: [5, 5],
            },
          ],
        },
        options: baseChartOptions,
      });
    } else {
      chartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Ощущается как (°C)",
              data: feelsLike,
              borderColor: "#8e44ad",
              backgroundColor: "rgba(142,68,173,0.2)",
              fill: true,
              tension: 0.3,
              pointRadius: 5,
            },
          ],
        },
        options: baseChartOptions,
      });
    }
  };

  const tempBtn = document.getElementById("tempChartBtn");
  const feelsBtn = document.getElementById("feelsChartBtn");

  tempBtn.onclick = () => {
    tempBtn.classList.add("active");
    feelsBtn.classList.remove("active");
    buildChart("temp");
  };
  feelsBtn.onclick = () => {
    feelsBtn.classList.add("active");
    tempBtn.classList.remove("active");
    buildChart("feels");
  };

  buildChart("temp");
}

function initMap(lat, lon) {
  if (map) {
    map.setView([lat, lon], 10);
    return;
  }
  map = L.map("map").setView([lat, lon], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(map);
  L.tileLayer(
    `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${apiKey}`,
    { opacity: 0.5 }
  ).addTo(map);
}

function degToCompass(num) {
  const val = Math.floor(num / 22.5 + 0.5);
  const arr = [
    "С", "ССВ", "СВ", "ВСВ", "В", "ВЮВ", "ЮВ", "ЮЮВ",
    "Ю", "ЮЮЗ", "ЮЗ", "ЗЮЗ", "З", "ЗСЗ", "СЗ", "ССЗ",
  ];
  return arr[val % 16];
}

if ('Notification' in window && navigator.serviceWorker) {
  Notification.requestPermission().then(permission => {
    if (permission === "granted") {
      console.log("🔔 Разрешение на уведомления получено");
    }
  });
}
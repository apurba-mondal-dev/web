const API_KEY = "bd5e378503939ddaee76f12ad7a97608";

const weatherIcons = {
  "clear sky": "☀️",
  "few clouds": "🌤️",
  "scattered clouds": "⛅",
  "broken clouds": "🌥️",
  "overcast clouds": "☁️",
  "light rain": "🌦️",
  "moderate rain": "🌧️",
  "heavy intensity rain": "🌧️",
  "very heavy rain": "🌧️",
  "shower rain": "🌦️",
  "thunderstorm": "⛈️",
  "snow": "❄️",
  "light snow": "🌨️",
  "mist": "🌫️",
  "haze": "🌫️",
  "fog": "🌫️",
  "smoke": "🌫️",
  "drizzle": "🌦️",
  "light drizzle": "🌦️"
};

function getWeatherIcon(description) {
  const desc = description.toLowerCase();
  for (const [key, icon] of Object.entries(weatherIcons)) {
    if (desc.includes(key)) return icon;
  }
  return "🌡️";
}

function formatTime(timestamp, timezone) {
  return new Date((timestamp + timezone) * 1000).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", timeZone: "UTC"
  });
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function showError(message) {
  const box = document.getElementById("err");
  box.style.display = "flex";
  document.getElementById("err-text").textContent = message;
  document.getElementById("loading").style.display = "none";
  document.getElementById("placeholder").style.display = "none";
  document.getElementById("result").style.display = "none";
}

function setLoading(on) {
  document.getElementById("loading").style.display = on ? "block" : "none";
  document.getElementById("placeholder").style.display = on ? "none" : "block";
  document.getElementById("err").style.display = "none";
  document.getElementById("result").style.display = "none";
}

async function getWeather() {
  const pin = document.getElementById("pin").value.trim();

  if (!/^\d{6}$/.test(pin)) {
    showError("Please enter a valid 6-digit Indian pincode.");
    return;
  }

  setLoading(true);

  try {
    // Step 1: Resolve pincode to lat/lon
    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/zip?zip=${pin},IN&appid=${API_KEY}`
    );
    if (!geoRes.ok) throw new Error("Pincode not found. Please check and try again.");
    const geo = await geoRes.json();
    if (!geo.lat) throw new Error("Pincode not found. Please check and try again.");

    // Step 2: Fetch current weather + 5-day forecast in parallel
    const [weatherRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${geo.lat}&lon=${geo.lon}&appid=${API_KEY}&units=metric`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${geo.lat}&lon=${geo.lon}&appid=${API_KEY}&units=metric`)
    ]);

    if (!weatherRes.ok || !forecastRes.ok) throw new Error("Could not fetch weather data.");

    const w = await weatherRes.json();
    const f = await forecastRes.json();

    // Populate location
    setText("loc-name", geo.name);
    setText("loc-meta", `${w.sys.country} · Pincode ${pin} · ${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`);
    setText("update-time", "Updated " + new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));

    // Populate current weather
    setText("temp", Math.round(w.main.temp));
    setText("feels", Math.round(w.main.feels_like));
    setText("tmax", Math.round(w.main.temp_max));
    setText("tmin", Math.round(w.main.temp_min));
    document.getElementById("wicon").textContent = getWeatherIcon(w.weather[0].description);
    setText("wdesc", w.weather[0].description);

    // Populate stats
    setText("hum", w.main.humidity);
    setText("wind", Math.round(w.wind.speed * 3.6));
    setText("vis", (w.visibility / 1000).toFixed(1));
    setText("pres", w.main.pressure);

    // Sunrise & Sunset
    setText("sunrise", formatTime(w.sys.sunrise, w.timezone));
    setText("sunset", formatTime(w.sys.sunset, w.timezone));

    // Build 5-day forecast from 3-hourly data
    const days = {};
    f.list.forEach(item => {
      const label = new Date(item.dt * 1000).toLocaleDateString("en-IN", {
        weekday: "short", month: "short", day: "numeric"
      });
      if (!days[label]) days[label] = { hi: [], lo: [], desc: [] };
      days[label].hi.push(item.main.temp_max);
      days[label].lo.push(item.main.temp_min);
      days[label].desc.push(item.weather[0].description);
    });

    const forecastEl = document.getElementById("forecast");
    forecastEl.innerHTML = Object.entries(days).slice(0, 5).map(([day, data]) => {
      const high = Math.round(Math.max(...data.hi));
      const low  = Math.round(Math.min(...data.lo));
      const midDesc = data.desc[Math.floor(data.desc.length / 2)];
      return `
        <div class="fc-card">
          <div class="fc-day">${day.split(",")[0]}</div>
          <div class="fc-icon">${getWeatherIcon(midDesc)}</div>
          <div class="fc-high">${high}°</div>
          <div class="fc-low">${low}°</div>
        </div>`;
    }).join("");

    // Show result
    setLoading(false);
    document.getElementById("placeholder").style.display = "none";
    document.getElementById("result").style.display = "block";

  } catch (e) {
    showError(e.message || "Something went wrong. Please try again.");
  }
}

// Allow pressing Enter to search
document.getElementById("pin").addEventListener("keydown", e => {
  if (e.key === "Enter") getWeather();
});

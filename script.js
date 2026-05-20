const margin = { top: 40, right: 30, bottom: 60, left: 60 };

const barSvg = d3.select("#barChart");
const pieSvg = d3.select("#pieChart");
const lineSvg = d3.select("#lineChart");

const tooltip = d3.select("#tooltip");

const width = 600;
const height = 400;
const lineWidth = 1200;

// LOAD DATA
d3.csv("netflix_titles.csv").then(data => {

    // parse
    data.forEach(d => {
        d.release_year = +d.release_year;
    });

    // ---------------- FILTERS ----------------

    const genreSelect = d3.select("#genreFilter");

    const genres = [...new Set(
        data.flatMap(d => (d.listed_in || "").split(",").map(g => g.trim()))
    )];

    genres.forEach(g => {
        genreSelect.append("option").attr("value", g).text(g);
    });

    // COUNTRY FILTER
    const controls = d3.select(".controls");

    const countrySelect = controls.append("select");

    countrySelect.append("option")
        .attr("value", "All")
        .text("All Countries");

    const countries = [...new Set(
        data.flatMap(d => (d.country || "").split(",").map(c => c.trim()))
    )].filter(d => d && d !== "");

    countries.forEach(c => {
        countrySelect.append("option").attr("value", c).text(c);
    });

    genreSelect.on("change", update);
    countrySelect.on("change", update);

    update();

    function update() {

        const g = genreSelect.node().value;
        const c = countrySelect.node().value;

        let filtered = data;

        // genre filter
        if (g !== "All") {
            filtered = filtered.filter(d =>
                (d.listed_in || "").includes(g)
            );
        }

        // country filter (FIXED: multi-country safe)
        if (c !== "All") {
            filtered = filtered.filter(d =>
                (d.country || "").includes(c)
            );
        }

        drawBar(filtered);
        drawPie(filtered);
        drawLine(filtered);
    }

});

// ---------------- BAR ----------------

function drawBar(data) {

    barSvg.selectAll("*").remove();

    const genres = {};

    data.forEach(d => {
        (d.listed_in || "").split(",").forEach(g => {
            g = g.trim();
            if (!g) return;
            genres[g] = (genres[g] || 0) + 1;
        });
    });

    const arr = Object.entries(genres)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const x = d3.scaleBand()
        .domain(arr.map(d => d[0]))
        .range([margin.left, width - margin.right])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(arr, d => d[1])])
        .range([height - margin.bottom, margin.top]);

    // AXIS X
    barSvg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-30)")
        .style("text-anchor", "end");

    // AXIS Y
    barSvg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    barSvg.selectAll("rect")
        .data(arr)
        .enter()
        .append("rect")
        .attr("x", d => x(d[0]))
        .attr("y", height - margin.bottom)
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("fill", "#E50914")
        .on("mousemove", (event, d) => {
            tooltip
                .style("opacity", 1)
                .html(`<b>${d[0]}</b><br>${d[1]}`)
                .style("left", event.pageX + "px")
                .style("top", event.pageY - 20 + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0))
        .transition()
        .duration(800)
        .attr("y", d => y(d[1]))
        .attr("height", d => height - margin.bottom - y(d[1]));
}

// ---------------- PIE ----------------
function drawPie(data) {

    pieSvg.selectAll("*").remove();

    const counts = d3.rollup(
        data,
        v => v.length,
        d => d.type
    );

    const arr = Array.from(counts, ([k, v]) => ({ k, v }));

    const radius = 140;

    const g = pieSvg.append("g")
        .attr("transform", `translate(${width / 2},${height / 2})`);

    const pie = d3.pie().value(d => d.v);
    const arc = d3.arc().innerRadius(0).outerRadius(radius);

    // 🔥 BOJE PO TIPU
    const color = d3.scaleOrdinal()
        .domain(["Movie", "TV Show"])
        .range(["#E50914", "#e57b09"]); // možeš kasnije promijeniti

    // 👇 ako želiš bolje razlikovanje:
    // .range(["#E50914", "#B81D24"]);

    g.selectAll("path")
        .data(pie(arr))
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.k))
        .attr("stroke", "#141414")
        .style("stroke-width", "2px")
        .on("mousemove", (event, d) => {
            tooltip
                .style("opacity", 1)
                .html(`
                    <b>${d.data.k}</b><br>
                    ${d.data.v} titles
                `)
                .style("left", event.pageX + "px")
                .style("top", event.pageY - 20 + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
}

// ---------------- LINE (FIXED AXES) ----------------

function drawLine(data) {

    lineSvg.selectAll("*").remove();

    const grouped = d3.rollups(
        data,
        v => v.length,
        d => d.release_year
    )
    .map(d => ({ year: d[0], count: d[1] }))
    .sort((a, b) => a.year - b.year);

    const x = d3.scaleLinear()
        .domain(d3.extent(grouped, d => d.year))
        .range([margin.left, lineWidth - margin.right]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(grouped, d => d.count)])
        .range([height - margin.bottom, margin.top]);

    // AXIS
    lineSvg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    lineSvg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.count));

    lineSvg.append("path")
        .datum(grouped)
        .attr("fill", "none")
        .attr("stroke", "#E50914")
        .attr("stroke-width", 2)
        .attr("d", line);

    lineSvg.selectAll("circle")
        .data(grouped)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.count))
        .attr("r", 4)
        .attr("fill", "#E50914")
        .on("mousemove", (event, d) => {
            tooltip
                .style("opacity", 1)
                .html(`${d.year}<br>${d.count}`)
                .style("left", event.pageX + "px")
                .style("top", event.pageY - 20 + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
}

// ============================
// WORLD MAP (FIXED + ZOOM)
// ============================

const mapSvg = d3.select("#worldMap")
    .attr("width", 900)
    .attr("height", 500);

const mapWidth = 900;
const mapHeight = 500;

// -------------------------
// NORMALIZACIJA DRŽAVA
// -------------------------

const countryFix = {
    "United States": "United States of America",
    "USA": "United States of America",
    "US": "United States of America",

    "Korea, Republic of": "South Korea",
    "South Korea": "South Korea",

    "Russian Federation": "Russia",
    "Viet Nam": "Vietnam",
    "Iran, Islamic Republic of": "Iran",
    "Hong Kong SAR": "Hong Kong",
    "Czechia": "Czech Republic",

    "United Kingdom": "United Kingdom",
    "United Kingdom of Great Britain and Northern Ireland": "United Kingdom"
};

function normalizeCountry(c) {
    return countryFix[c.trim()] || c.trim();
}

// -------------------------
// BROJANJE
// -------------------------

function getCountryCounts(data) {

    const counts = {};

    data.forEach(d => {
        if (!d.country) return;

        d.country.split(",").forEach(c => {

            const country = normalizeCountry(c);
            if (!country) return;

            counts[country] = (counts[country] || 0) + 1;
        });
    });

    return counts;
}

// -------------------------
// MAP LOAD
// -------------------------

Promise.all([
    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
]).then(([world]) => {

    const countries = topojson.feature(world, world.objects.countries);

    const projection = d3.geoMercator()
        .scale(140)
        .translate([mapWidth / 2, mapHeight / 1.4]);

    const path = d3.geoPath().projection(projection);

    const g = mapSvg.append("g");

    d3.csv("netflix_titles.csv").then(data => {

        const counts = getCountryCounts(data);

        const maxVal = d3.max(Object.values(counts));

        const color = d3.scaleSequential()
            .domain([0, maxVal])
            .interpolator(d3.interpolateReds);

        g.selectAll("path")
            .data(countries.features)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("fill", d => {
                const rawName = d.properties.name;
                const name = normalizeCountry(rawName);
                return counts[name] ? color(counts[name]) : "#2a2a2a";
            })
            .attr("stroke", "#111")
            .style("cursor", "pointer")
            .on("click", (event, d) => {

               const rawName = d.properties.name;
                const name = normalizeCountry(rawName);
                const value = counts[name] || 0;

                d3.select("#tooltip")
                    .style("opacity", 1)
                    .html(`<b>${name}</b><br>${value} titles`)
                    .style("left", event.pageX + "px")
                    .style("top", event.pageY - 20 + "px");
            });

        // -------------------------
        // ZOOM FUNCTIONALITY
        // -------------------------

        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                g.attr("transform", event.transform);
            });

        mapSvg.call(zoom);
    });

});
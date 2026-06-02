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
        
    //x labela
    barSvg.append("text")
        .attr("x", width )
        .attr("y", height-30)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .text("Genre");


        // Y AXIS LABEL
    barSvg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .text("Number of Titles");

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

    //  BOJE 
    const color = d3.scaleOrdinal()
        .domain(["Movie", "TV Show"])
        .range(["#E50914", "#e57b09"]); 

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
    const legend = pieSvg.append("g")
        .attr("transform", "translate(450, 100)");

    legend.selectAll("rect")
        .data(arr)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", (d, i) => i * 30)
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", d => color(d.k));

    legend.selectAll("text")
        .data(arr)
        .enter()
        .append("text")
        .attr("x", 28)
        .attr("y", (d, i) => i * 30 + 14)
        .attr("fill", "white")
        .style("font-size", "14px")
        .text(d => d.k);
}

// ---------------- LINE ----------------

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
    // X AXIS LABEL
    lineSvg.append("text")
        .attr("x", lineWidth / 2)
        .attr("y", height - 5)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "14px")
        .text("Release Year");

    // Y AXIS LABEL
    lineSvg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .style("font-size", "14px")
        .text("Number of Titles");

    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.count));

   const path = lineSvg.append("path")
    .datum(grouped)
    .attr("fill", "none")
    .attr("stroke", "#E50914")
    .attr("stroke-width", 3)
    .attr("d", line);

    // ukupna duljina linije
    const totalLength = path.node().getTotalLength();

    // sakrij cijelu liniju
    path
        .attr("stroke-dasharray", totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(2500)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);

    const circles = lineSvg.selectAll("circle")
        .data(grouped)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.count))
        .attr("r", 0)
        .attr("fill", "#E50914");

    circles
        .transition()
        .delay(2500)
        .duration(500)
        .attr("r", 4);

    circles
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

    let resetTimer;

    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {

            g.attr("transform", event.transform);

            // reset countdown
            clearTimeout(resetTimer);

            resetTimer = setTimeout(() => {

        mapSvg.transition()
            .duration(1000)
            .call(zoom.transform, d3.zoomIdentity);
                
        // HIDE
        d3.select("#tooltip")
            .style("opacity", 0);
                
        }, 2000);

        });

    mapSvg.call(zoom);

      
    });

});
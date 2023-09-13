let scrapeStocks = document.getElementById('scrapestocks')

scrapeStocks.addEventListener("click", async () => {
    // Get current active tab
    let [tab] = await chrome.tabs.query({active: true, currentWindow: true})

    // Execute script to get stock data on page
    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: scrapeStocksDataFromPage
    })
})

//Function to scrape stock data from page
function scrapeStocksDataFromPage() {
    function getCostInflationIndex(year) {
        switch(year){ 
            case 2001: return 100;
            case 2002: return 105;
            case 2003: return 109;
            case 2004: return 113;
            case 2005: return 117;
            case 2006: return 122;
            case 2007: return 129;
            case 2008: return 137;
            case 2009: return 148;
            case 2010: return 167;
            case 2011: return 184;
            case 2012: return 200;
            case 2013: return 220;
            case 2014: return 240;
            case 2015: return 254;
            case 2016: return 264;
            case 2017: return 272;
            case 2018: return 280;
            case 2019: return 289;
            case 2020: return 301;
            case 2021: return 317;
            case 2022: return 331;
            case 2023: return 348;
        }
    }

    var table = document.querySelectorAll("[class=fd-table--table]")[1]
    var header = []
    var rows = []
    var processedRows = []

    for (var i = 0; i < table.rows[0].cells.length; i++) {
        header.push(table.rows[0].cells[i].innerText);
    }

    var x = table.rows[0].insertCell(-1)
    x.innerText = "Approx. Tax"
    x.className = "fd-table--header-cell tooltip"

    for (var i = 1; i < table.rows.length; i++) {
        var row = {};
        var processedRow = {}
        for (var j = 0; j < table.rows[i].cells.length; j++) {
            row[header[j]] = table.rows[i].cells[j].innerText
        }
        rows.push(row)

        //Process data
        processedRow["buyDate"] = new Date(row["Date acquired"])
        processedRow["quantity"] = Number(row["Quantity"])
        processedRow["currency"] = row["Cost basis"][0]
        processedRow["buyValue"] = Number(row["Cost basis"].replace(/[^0-9.-]+/g,""))
        processedRow["currentValue"] = Number(row["Value"].replace(/[^0-9.-]+/g,""))
        processedRows.push(processedRow)

        //Calculate tax and insert
        let tmp = table.rows[i].insertCell(-1)
        tmp.className = "fd-table--cell tooltip"
        
        var tmptooltip = document.createElement('span')
        tmptooltip.className = "tooltiptext"
        
        const buyDate = processedRow["buyDate"]
        const toDate = new Date()
        const daysPassed = (toDate.getTime() - buyDate.getTime())/(1000 * 3600 * 24);
        
        if (daysPassed >= (365*2)) {
            // If holding period >= 2 years
            // LTCG Tax at 20% with indexation
            tmptooltip.innerText = "LTCG at 20% with indexation"

            // If month is Jan, Feb, March, take CII data for previous year. e.g. for Jan 2024, consider data for 2023-24 year.
            const fyBuy = buyDate.getFullYear()
            if (buyDate.getMonth() <= 2) {
                fyBuy--
            }
            const fySell = toDate.getFullYear()
            if (toDate.getMonth() <= 2) {
                fySell--
            }

            const inflationAdjustedBuyValue = (getCostInflationIndex(fySell)/getCostInflationIndex(fyBuy)) * processedRow["buyValue"]
            const profit = processedRow["currentValue"] - inflationAdjustedBuyValue

            if (profit > 0) {
                tmp.innerText = processedRow["currency"] + (profit*.2).toFixed(2).toString()
            } else {
                tmp.innerText = processedRow["currency"] + (0).toString()
            }
        } else {
            // If holding period < 2 years
            // STCG Tax at slab rate
            tmptooltip.innerText = "STCG at your current slab rate"
            const profit = processedRow["currentValue"] - processedRow["buyValue"]

            // TODO: Give user option to select slab rate
            const slabRate = 0.3
            if (profit > 0) {
                tmp.innerText = processedRow["currency"] + (profit*slabRate).toFixed(2).toString()
            } else {
                tmp.innerText = processedRow["currency"] + (0).toString()
            }
        }

        tmp.appendChild(tmptooltip)
    }
    
    console.log(processedRows)
    // alert(JSON.stringify(rows));
}
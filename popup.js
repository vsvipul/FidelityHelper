let scrapeStocks = document.getElementById('scrapestocks');

scrapeStocks.addEventListener("click", async () => {
    // Get current active tab
    let [tab] = await chrome.tabs.query({active: true, currentWindow: true})

    // Execute script to get stock data on page
    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: scrapeStocksDataFromPage,
		args: [getSlab(), getNumStocks()]
    })
})

function getSlab()
{
	var slabRateStr = document.querySelector('#slabSelect').value;
	return parseFloat(slabRateStr)/100;
}

function getNumStocks()
{
	var numStocksStr = document.querySelector('#numStocks').value;
	return numStocksStr;
	
}

//Function to scrape stock data from page
function scrapeStocksDataFromPage(slab, numStocks) {
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
	
	function getTaxFromSharesSell(numStocks, processedRows, totalShares, slab)
	{
		//sort processedRows by ascending order of buyDate
        processedRows.sort(function(a,b){
            return new Date(a.buyDate) - new Date(b.buyDate);
        });

        var totalTaxSoFar = 0;
        var stocksSoldSoFar = 0;

        for (var i = 0; i < processedRows.length; i++) {

            var currentRow = processedRows[i];
            var curSharesTaken = 0.0000;


            console.log("numstocks=" + numStocks + " stocksSoldSoFar=" + stocksSoldSoFar + " currentRow.quantity=" + currentRow.quantity + " totalTaxSoFar=" + totalTaxSoFar + "curTax=" + currentRow.tax)

             // if remaining stocks to be taken is more than current row quantity, take all of current row
            if((numStocks - stocksSoldSoFar) > currentRow.quantity) {

               
                curSharesTaken = currentRow.quantity;
                stocksSoldSoFar += currentRow.quantity;
                totalTaxSoFar += currentRow.tax;
                continue;
            }
            else {
                curSharesTaken = numStocks - stocksSoldSoFar;
                stocksSoldSoFar += curSharesTaken;

                //calculate tax for current row and add to totalTaxSoFar
                if(currentRow.gainType == "LTCG") {

                    var inflationAdjustedBuyValue = curSharesTaken * (currentRow.buyValue/currentRow.quantity) * currentRow.ciiRatio;
                    var sellValue = curSharesTaken * (currentRow.currentValue/currentRow.quantity);
                    var curProfit = sellValue - inflationAdjustedBuyValue;
                    totalTaxSoFar += curProfit * 0.2;
                    
                }
                else {
                    var buyValue = curSharesTaken * (currentRow.buyValue/currentRow.quantity);
                    var sellValue = curSharesTaken * (currentRow.currentValue/currentRow.quantity);
                    var curProfit = sellValue - buyValue;
                    totalTaxSoFar += curProfit * slab;
                }

                break;

            }

        }

        
        return totalTaxSoFar;

    }


    // Delete if column already exists
    if (document.querySelectorAll("[class=fd-table--table]")[1].firstElementChild.firstElementChild.lastElementChild.textContent == 'Approx. Tax') {
        document.querySelectorAll("[class=fd-table--table]")[1].id = "random-x-id"
        document.querySelectorAll("#random-x-id th:last-child, #random-x-id td:last-child").forEach(el => el.remove())
    }

    var table = document.querySelectorAll("[class=fd-table--table]")[1]
    var header = []
    var rows = []
    var processedRows = []
	var totalShares = 0.0000

    for (var i = 0; i < table.rows[0].cells.length; i++) {
        header.push(table.rows[0].cells[i].innerText);
    }

    table.rows[0].insertCell(-1).outerHTML = "<th class='fd-table--header-cell tooltip'>Approx. Tax</th> "

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
       
	   
		totalShares += processedRow["quantity"];
		
        //Calculate tax and insert
        let tmp = table.rows[i].insertCell(-1)
        tmp.className = "fd-table--cell tooltip"
        
        var tmptooltip = document.createElement('span')
        tmptooltip.className = "tooltiptext"
        
        const buyDate = processedRow["buyDate"]
        const toDate = new Date()
        const daysPassed = (toDate.getTime() - buyDate.getTime())/(1000 * 3600 * 24);
		var tax;
        var profit;
        
        if (daysPassed >= (365*2)) {
            // If holding period >= 2 years
            // LTCG Tax at 20% with indexation
			processedRow["gainType"] = "LTCG";
			
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

            const ciiRatio =  (getCostInflationIndex(fySell)/getCostInflationIndex(fyBuy));
            const inflationAdjustedBuyValue = ciiRatio * processedRow["buyValue"]
            profit = processedRow["currentValue"] - inflationAdjustedBuyValue
            processedRow["ciiRatio"] = ciiRatio;

            if (profit > 0) {
				tax = (profit*.2).toFixed(2)
            } else {
				tax = 0.0000
            }
			
        } else {
            // If holding period < 2 years
            // STCG Tax at slab rate
			processedRow["gainType"] = "STCG";
            tmptooltip.innerText = "STCG at your current slab rate"
            profit = processedRow["currentValue"] - processedRow["buyValue"]

            // TODO: Give user option to select slab rate
            const slabRate = (slab == null || slab == NaN) ? 0.3 : slab;
			
            if (profit > 0) {
                tax =  (profit*slabRate).toFixed(2)
            } else {
                tax = 0.0000
            }
			
        }
		
		tmp.innerText = processedRow["currency"] + tax.toString();
		processedRow["tax"] = parseFloat(tax);

		processedRows.push(processedRow)
        tmp.appendChild(tmptooltip)
    }
	
     /* showing  tax liability for num stocks */

    //1. clear the previous html content

    var taxElement = document.getElementById("taxLiability");
    if(taxElement != null) taxElement.remove();


    //2. insert new html content
    var html = "<div id='taxLiability'>";
	var parentDiv = document.getElementById("fd-table_sortable_1").parentNode;
	
    //3. do sanity check
	if(numStocks > totalShares) {
		html += "<p> Number of shares to sell invalid. Cannot sell more than what you currently hold. </p> </div>";
	}
	
    //4. proceed with calculation
	else {

		var totalTax = getTaxFromSharesSell(numStocks, processedRows, totalShares, slab).toFixed(2).toString();

		var stocksHtml = "<p> Number of Shares = " + numStocks + "</p>";
		var totalTaxHtml = "<p> Tax after sale = " + totalTax + "</p>";	
		html += stocksHtml + totalTaxHtml + "</div>";
	}
	
    //5. append tax data
	parentDiv.insertAdjacentHTML('afterend', html);
}

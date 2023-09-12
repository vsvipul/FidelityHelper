let scrapeStocks = document.getElementById('scrapestocks')

scrapeStocks.addEventListener("click", async () => {
    // alert("hello world")
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
    // alert("hello")
    var table = document.querySelectorAll("[class=fd-table--table]")[1];
    var header = [];
    var rows = [];

    for (var i = 0; i < table.rows[0].cells.length; i++) {
        header.push(table.rows[0].cells[i].innerText);
    }

    for (var i = 1; i < table.rows.length; i++) {
        var row = {};
        for (var j = 0; j < table.rows[i].cells.length; j++) {
            row[header[j]] = table.rows[i].cells[j].innerText;
        }
        rows.push(row);
    }

    // console.log(rows)

    alert(JSON.stringify(rows));
}

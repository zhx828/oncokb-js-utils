/**
 * Created by zhangh2 on 8/17/15.
 */

var script = (function () {
    var page = new WebPage(),
        url = 'https://research.nhgri.nih.gov/projects/bic/circos/cgi-bin/circos_query_result.cgi?CCS=all',
        stepIndex = 0;
    var fs = require('fs'),
        filePath = '/Users/zhangh2/repos/oncokb-js-utils/phantom/data/pubMedInfo.txt';

    /**
     * From PhantomJS documentation:
     * This callback is invoked when there is a JavaScript console. The callback may accept up to three arguments:
     * the string for the message, the line number, and the source identifier.
     */
    page.onConsoleMessage = function (msg, line, source) {
        console.log('console> ' + msg);
    };

    /**
     * From PhantomJS documentation:
     * This callback is invoked when there is a JavaScript alert. The only argument passed to the callback is the string for the message.
     */
    page.onAlert = function (msg) {
        console.log('alert!!> ' + msg);
    };

// Callback is executed each time a page is loaded...
    page.open(url, function (status) {
        if (status === 'success') {
            // State is initially empty. State is persisted between page loads and can be used for identifying which page we're on.
            console.log('============================================');
            console.log('Step "' + stepIndex + '"');
            console.log('============================================');

            // Inject jQuery for scraping (you need to save jquery-1.6.1.min.js in the same folder as this file)
            page.injectJs('jquery-1.6.1.min.js');

            // Our "event loop"
            if (!phantom.state) {
                initialize();
            } else {
                phantom.state();
            }

            // Save screenshot for debugging purposes
            //page.render("step" + stepIndex++ + ".png");
            phantom.exit();
        }
    });

    function initialize() {
        var result = page.evaluate(function () {
            function Header() {
                this.pubmed = '';
                this.name = '';
            }

            function Result() {
                this.name = '';
                this.pubmed = [];
            }

            var headers = [], results = [];

            //Find table header information
            $('table.styled tbody tr:nth-child(1) th').each(function () {
                var str = $(this).html().toString();
                var matches = /pubmed\/(\d+)/g.exec(str);
                var header = new Header();

                header.name = $(this).text();
                if (matches instanceof Array && matches.length > 1) {
                    header.pubmed = matches[1];
                }
                headers.push(header);
            });

            //Organize tabel info into array and push pubmed ID into it if the criteria has been matched.
            $('table.styled tbody tr').not(':first').each(function () {
                var result = new Result();

                result.name = $(this).find('td:nth-child(4)').text();
                $(this).find('td').each(function (i, e) {
                    if ($(this).text() === 'F') {
                        result.pubmed.push(headers[i]);
                    }
                });
                if (result.pubmed.length > 0) {
                    results.push(result);
                }
            });
            return results;
        });
        fs.write(filePath, JSON.stringify(result), 'w');
        // Phantom state doesn't change between page reloads
        // We use the state to store the search result handler, ie. the next step
        phantom.state = parseResults;
    }

    function parseResults() {
        page.evaluate(function () {
            $('#search-result a').each(function (index, link) {
                console.log($(link).attr('href'));
            })
            console.log('Parsed results');
        });
        // If there was a 3rd step we could point to another function
        // but we would have to reload the page for the callback to be called again
        phantom.exit();
    }
})();
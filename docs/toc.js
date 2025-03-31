// Populate the sidebar
//
// This is a script, and not included directly in the page, to control the total size of the book.
// The TOC contains an entry for each page, so if each page includes a copy of the TOC,
// the total size of the page becomes O(n**2).
class MDBookSidebarScrollbox extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded affix "><a href="front-cover.html">Practical MongoDB Aggregations</a></li><li class="chapter-item expanded affix "><a href="credits.html">Credits</a></li><li class="chapter-item expanded affix "><a href="advert.html">Advert</a></li><li class="chapter-item expanded affix "><a href="foreword.html">Foreword</a></li><li class="chapter-item expanded affix "><a href="who-this-is-for.html">Who This Book Is For</a></li><li class="chapter-item expanded "><a href="intro/introduction.html"><strong aria-hidden="true">1.</strong> Introduction</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="intro/introducing-aggregations.html"><strong aria-hidden="true">1.1.</strong> Introducing MongoDB Aggregations</a></li><li class="chapter-item expanded "><a href="intro/history.html"><strong aria-hidden="true">1.2.</strong> History of MongoDB Aggregations</a></li><li class="chapter-item expanded "><a href="intro/getting-started.html"><strong aria-hidden="true">1.3.</strong> Getting Started</a></li><li class="chapter-item expanded "><a href="intro/getting-help.html"><strong aria-hidden="true">1.4.</strong> Getting Help</a></li></ol></li><li class="chapter-item expanded "><a href="guides/guides.html"><strong aria-hidden="true">2.</strong> Guiding Tips &amp; Principles</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="guides/composibility.html"><strong aria-hidden="true">2.1.</strong> Embrace Composability For Increased Productivity</a></li><li class="chapter-item expanded "><a href="guides/project.html"><strong aria-hidden="true">2.2.</strong> Better Alternatives To A Project Stage</a></li><li class="chapter-item expanded "><a href="guides/explain.html"><strong aria-hidden="true">2.3.</strong> Using Explain Plans</a></li><li class="chapter-item expanded "><a href="guides/performance.html"><strong aria-hidden="true">2.4.</strong> Pipeline Performance Considerations</a></li><li class="chapter-item expanded "><a href="guides/expressions.html"><strong aria-hidden="true">2.5.</strong> Expressions Explained</a></li><li class="chapter-item expanded "><a href="guides/sharding.html"><strong aria-hidden="true">2.6.</strong> Sharding Considerations</a></li><li class="chapter-item expanded "><a href="guides/advanced-arrays.html"><strong aria-hidden="true">2.7.</strong> Advanced Use Of Expressions For Array Processing</a></li></ol></li><li class="chapter-item expanded "><a href="examples/examples.html"><strong aria-hidden="true">3.</strong> Aggregations By Example</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="examples/foundational/foundational.html"><strong aria-hidden="true">3.1.</strong> Foundational Examples</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="examples/foundational/filtered-top-subset.html"><strong aria-hidden="true">3.1.1.</strong> Filtered Top Subset</a></li><li class="chapter-item expanded "><a href="examples/foundational/group-and-total.html"><strong aria-hidden="true">3.1.2.</strong> Group &amp; Total</a></li><li class="chapter-item expanded "><a href="examples/foundational/unpack-array-group-differently.html"><strong aria-hidden="true">3.1.3.</strong> Unpack Arrays &amp; Group Differently</a></li><li class="chapter-item expanded "><a href="examples/foundational/distinct-values.html"><strong aria-hidden="true">3.1.4.</strong> Distinct List Of Values</a></li></ol></li><li class="chapter-item expanded "><a href="examples/joining/joining.html"><strong aria-hidden="true">3.2.</strong> Joining Data Examples</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="examples/joining/one-to-one-join.html"><strong aria-hidden="true">3.2.1.</strong> One-to-One Join</a></li><li class="chapter-item expanded "><a href="examples/joining/multi-one-to-many.html"><strong aria-hidden="true">3.2.2.</strong> Multi-Field Join &amp; One-to-Many</a></li></ol></li><li class="chapter-item expanded "><a href="examples/type-convert/type-convert.html"><strong aria-hidden="true">3.3.</strong> Data Types Conversion Examples</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="examples/type-convert/convert-to-strongly-typed.html"><strong aria-hidden="true">3.3.1.</strong> Strongly-Typed Conversion</a></li><li class="chapter-item expanded "><a href="examples/type-convert/convert-incomplete-dates.html"><strong aria-hidden="true">3.3.2.</strong> Convert Incomplete Date Strings</a></li></ol></li><li class="chapter-item expanded "><a href="examples/trend-analysis/trend-analysis.html"><strong aria-hidden="true">3.4.</strong> Trend Analysis Examples</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="examples/trend-analysis/faceted-classifications.html"><strong aria-hidden="true">3.4.1.</strong> Faceted Classification</a></li><li class="chapter-item expanded "><a href="examples/trend-analysis/largest-graph-network.html"><strong aria-hidden="true">3.4.2.</strong> Largest Graph Network</a></li><li class="chapter-item expanded "><a href="examples/trend-analysis/incremental-analytics.html"><strong aria-hidden="true">3.4.3.</strong> Incremental Analytics</a></li></ol></li><li class="chapter-item expanded "><a href="examples/securing-data/securing-data.html"><strong aria-hidden="true">3.5.</strong> Securing Data Examples</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="examples/securing-data/redacted-view.html"><strong aria-hidden="true">3.5.1.</strong> Redacted View</a></li><li class="chapter-item expanded "><a href="examples/securing-data/mask-sensitive-fields.html"><strong aria-hidden="true">3.5.2.</strong> Mask Sensitive Fields</a></li><li class="chapter-item expanded "><a href="examples/securing-data/role-programmatic-restricted-view.html"><strong aria-hidden="true">3.5.3.</strong> Role Programmatic Restricted View</a></li></ol></li><li class="chapter-item expanded "><a href="examples/time-series/time-series.html"><strong aria-hidden="true">3.6.</strong> Time-Series Examples</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="examples/time-series/iot-power-consumption.html"><strong aria-hidden="true">3.6.1.</strong> IoT Power Consumption</a></li><li class="chapter-item expanded "><a href="examples/time-series/state-change-boundaries.html"><strong aria-hidden="true">3.6.2.</strong> State Change Boundaries</a></li></ol></li><li class="chapter-item expanded "><a href="examples/array-manipulations/array-manipulations.html"><strong aria-hidden="true">3.7.</strong> Array Manipulation Examples</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="examples/array-manipulations/array-high-low-avg.html"><strong aria-hidden="true">3.7.1.</strong> Summarising Arrays For First, Last, Min, Max &amp; Average</a></li><li class="chapter-item expanded "><a href="examples/array-manipulations/pivot-array-items.html"><strong aria-hidden="true">3.7.2.</strong> Pivot Array Items By A Key</a></li><li class="chapter-item expanded "><a href="examples/array-manipulations/array-sort-percentiles.html"><strong aria-hidden="true">3.7.3.</strong> Array Sorting &amp; Percentiles</a></li><li class="chapter-item expanded "><a href="examples/array-manipulations/array-element-grouping.html"><strong aria-hidden="true">3.7.4.</strong> Array Element Grouping</a></li><li class="chapter-item expanded "><a href="examples/array-manipulations/array-fields-joining.html"><strong aria-hidden="true">3.7.5.</strong> Array Fields Joining</a></li><li class="chapter-item expanded "><a href="examples/array-manipulations/comparison-of-two-arrays.html"><strong aria-hidden="true">3.7.6.</strong> Comparison Of Two Arrays</a></li></ol></li><li class="chapter-item expanded "><a href="examples/full-text-search/full-text-search.html"><strong aria-hidden="true">3.8.</strong> Full Text Search Examples</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="examples/full-text-search/compound-text-search.html"><strong aria-hidden="true">3.8.1.</strong> Compound Text Search Criteria</a></li><li class="chapter-item expanded "><a href="examples/full-text-search/facets-and-counts-text-search.html"><strong aria-hidden="true">3.8.2.</strong> Facets And Counts Text Search</a></li></ol></li></ol></li><li class="chapter-item expanded "><a href="appendices/appendices.html"><strong aria-hidden="true">4.</strong> Appendices</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="appendices/cheatsheet.html"><strong aria-hidden="true">4.1.</strong> Appendix: Stages Cheatsheet</a></li><li class="chapter-item expanded "><a href="appendices/cheatsheet-source.html"><strong aria-hidden="true">4.2.</strong> Appendix: Stages Cheatsheet Source</a></li><li class="chapter-item expanded "><a href="appendices/create-search-index.html"><strong aria-hidden="true">4.3.</strong> Appendix: Create Atlas Search Index</a></li><li class="chapter-item expanded "><a href="appendices/book-history.html"><strong aria-hidden="true">4.4.</strong> Appendix: Book Version History</a></li></ol></li><li class="chapter-item expanded "><a href="back-cover.html"></a></li></ol>';
        // Set the current, active page, and reveal it if it's hidden
        let current_page = document.location.href.toString().split("#")[0];
        if (current_page.endsWith("/")) {
            current_page += "index.html";
        }
        var links = Array.prototype.slice.call(this.querySelectorAll("a"));
        var l = links.length;
        for (var i = 0; i < l; ++i) {
            var link = links[i];
            var href = link.getAttribute("href");
            if (href && !href.startsWith("#") && !/^(?:[a-z+]+:)?\/\//.test(href)) {
                link.href = path_to_root + href;
            }
            // The "index" page is supposed to alias the first chapter in the book.
            if (link.href === current_page || (i === 0 && path_to_root === "" && current_page.endsWith("/index.html"))) {
                link.classList.add("active");
                var parent = link.parentElement;
                if (parent && parent.classList.contains("chapter-item")) {
                    parent.classList.add("expanded");
                }
                while (parent) {
                    if (parent.tagName === "LI" && parent.previousElementSibling) {
                        if (parent.previousElementSibling.classList.contains("chapter-item")) {
                            parent.previousElementSibling.classList.add("expanded");
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        }
        // Track and set sidebar scroll position
        this.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                sessionStorage.setItem('sidebar-scroll', this.scrollTop);
            }
        }, { passive: true });
        var sidebarScrollTop = sessionStorage.getItem('sidebar-scroll');
        sessionStorage.removeItem('sidebar-scroll');
        if (sidebarScrollTop) {
            // preserve sidebar scroll position when navigating via links within sidebar
            this.scrollTop = sidebarScrollTop;
        } else {
            // scroll sidebar to current active section when navigating via "next/previous chapter" buttons
            var activeSection = document.querySelector('#sidebar .active');
            if (activeSection) {
                activeSection.scrollIntoView({ block: 'center' });
            }
        }
        // Toggle buttons
        var sidebarAnchorToggles = document.querySelectorAll('#sidebar a.toggle');
        function toggleSection(ev) {
            ev.currentTarget.parentElement.classList.toggle('expanded');
        }
        Array.from(sidebarAnchorToggles).forEach(function (el) {
            el.addEventListener('click', toggleSection);
        });
    }
}
window.customElements.define("mdbook-sidebar-scrollbox", MDBookSidebarScrollbox);

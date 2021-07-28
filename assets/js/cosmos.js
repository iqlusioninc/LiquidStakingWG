(function (cosmos) {
  cosmos.addEvent = function (el, type, handler) {
    if (el.attachEvent) {
      el.attachEvent("on" + type, handler);
    } else {
      el.addEventListener(type, handler);
    }
  };

  cosmos.onReady = function (ready) {
    if (document.readyState != "loading") {
      ready();
    } else if (document.addEventListener) {
      document.addEventListener("DOMContentLoaded", ready);
    } else {
      document.attachEvent("onreadystatechange", function () {
        if (document.readyState == "complete") {
          ready();
        }
      });
    }
  };

  function initBurger() {
    const burger = document.getElementById("burger");
    cosmos.addEvent(burger, "click", function () {
      const navigation = document.querySelector("#header > .navigation");
      this.classList.toggle("active");
      navigation.classList.toggle("visible");
      document.body.classList.toggle("no-scroll");
    });
  }

  function handleMeetingNoteClick(e) {
    if (this.classList.contains("active")) {
      if (e.target.className === "minimize") {
        this.scrollTop = 0;
        this.classList.remove("active");
        document.body.classList.remove("no-scroll");
      }
    } else {
      this.classList.add("active");
      document.body.classList.add("no-scroll");
    }
  }

  function initMeetingNotes() {
    Array.from(document.getElementsByClassName("meeting-note-overlay")).forEach(
      (element) => {
        cosmos.addEvent(element, "click", handleMeetingNoteClick);
      }
    );
  }

  function initSearch() {
    lunr.tokenizer.separator = /[\s\-/]+/;

    const index = lunr(function () {
      this.ref("id");
      this.field("title", { boost: 200 });
      this.field("content", { boost: 2 });

      this.metadataWhitelist = ["position"];

      for (let i in window.searchStore) {
        this.add({
          id: i,
          title: window.searchStore[i].title,
          content: window.searchStore[i].content,
        });
      }
    });

    searchLoaded(index, window.searchStore);
  }

  function searchLoaded(index, docs) {
    const searchIndex = index;
    const searchDocs = docs;
    const searchInput = document.querySelector(".search-input-wrapper > input");
    let searchResults = document.getElementById("search-results");
    let currentInput;
    let currentSearchIndex = 0;

    function showSearch() {
      document.body.classList.add("search-active");
    }

    function hideSearch() {
      document.body.classList.remove("search-active");
    }

    function update() {
      currentSearchIndex++;

      let input = searchInput.value;

      if (input === "") {
        hideSearch();
      } else {
        showSearch();
        // scroll search input into view, workaround for iOS Safari
        window.scroll(0, -1);
        setTimeout(function () {
          window.scroll(0, 0);
        }, 0);
      }
      if (input === currentInput) {
        return;
      }
      currentInput = input;
      searchResults.innerHTML = "";
      if (input === "") {
        return;
      }

      let results = searchIndex.query(function (query) {
        const tokens = lunr.tokenizer(input);
        query.term(tokens, {
          boost: 10,
        });
        query.term(tokens, {
          wildcard: lunr.Query.wildcard.TRAILING,
        });
      });

      if (results.length == 0 && input.length > 2) {
        const tokens = lunr.tokenizer(input).filter(function (token, i) {
          return token.str.length < 20;
        });
        if (tokens.length > 0) {
          results = searchIndex.query(function (query) {
            query.term(tokens, {
              editDistance: Math.round(Math.sqrt(input.length / 2 - 1)),
            });
          });
        }
      }

      if (results.length == 0) {
        const noResultsDiv = document.createElement("div");
        noResultsDiv.classList.add("search-no-result");
        noResultsDiv.innerText = "No results found";
        searchResults.appendChild(noResultsDiv);
      } else {
        const resultsList = document.createElement("div");
        resultsList.classList.add("search-results-list");
        searchResults.appendChild(resultsList);

        addResults(resultsList, results, 0, 10, 100, currentSearchIndex);
      }

      function addResults(
        resultsList,
        results,
        start,
        batchSize,
        batchMillis,
        searchIndex
      ) {
        if (searchIndex != currentSearchIndex) {
          return;
        }
        for (let i = start; i < start + batchSize; i++) {
          if (i == results.length) {
            return;
          }
          addResult(resultsList, results[i]);
        }
        setTimeout(function () {
          addResults(
            resultsList,
            results,
            start + batchSize,
            batchSize,
            batchMillis,
            searchIndex
          );
        }, batchMillis);
      }

      function addResult(resultsList, result) {
        const doc = searchDocs[result.ref];

        const resultsListItem = document.createElement("a");
        resultsListItem.classList.add("search-results-item");
        resultsList.appendChild(resultsListItem);
        resultsListItem.setAttribute("href", doc.url);

        const resultCategory = document.createElement("div");
        resultCategory.classList.add("category");

        const categoryIcon = document.createElement("div");
        categoryIcon.classList.add("icon");
        resultCategory.appendChild(categoryIcon);

        const categoryText = document.createElement("span");
        categoryText.textContent = doc.category;
        resultCategory.appendChild(categoryText);

        resultsListItem.appendChild(resultCategory);

        const resultContent = document.createElement("div");
        resultContent.classList.add("content");

        const contentTitle = document.createElement("h1");
        contentTitle.textContent = doc.title;
        resultContent.appendChild(contentTitle);

        const contentLink = document.createElement("span");
        contentLink.textContent = doc.url;
        resultContent.appendChild(contentLink);

        resultsListItem.appendChild(resultContent);

        const metadata = result.matchData.metadata;
        const contentPositions = [];
        for (let j in metadata) {
          const meta = metadata[j];
          if (meta.content) {
            const positions = meta.content.position;
            for (let k in positions) {
              const position = positions[k];
              let previewStart = position[0];
              let previewEnd = position[0] + position[1];
              let ellipsesBefore = true;
              let ellipsesAfter = true;
              for (let k = 0; k < 5; k++) {
                let nextSpace = doc.content.lastIndexOf(" ", previewStart - 2);
                let nextDot = doc.content.lastIndexOf(". ", previewStart - 2);
                if (nextDot >= 0 && nextDot > nextSpace) {
                  previewStart = nextDot + 1;
                  ellipsesBefore = false;
                  break;
                }
                if (nextSpace < 0) {
                  previewStart = 0;
                  ellipsesBefore = false;
                  break;
                }
                previewStart = nextSpace + 1;
              }
              for (let k = 0; k < 10; k++) {
                let nextSpace = doc.content.indexOf(" ", previewEnd + 1);
                let nextDot = doc.content.indexOf(". ", previewEnd + 1);
                if (nextDot >= 0 && nextDot < nextSpace) {
                  previewEnd = nextDot;
                  ellipsesAfter = false;
                  break;
                }
                if (nextSpace < 0) {
                  previewEnd = doc.content.length;
                  ellipsesAfter = false;
                  break;
                }
                previewEnd = nextSpace;
              }
              contentPositions.push({
                highlight: position,
                previewStart: previewStart,
                previewEnd: previewEnd,
                ellipsesBefore: ellipsesBefore,
                ellipsesAfter: ellipsesAfter,
              });
            }
          }
        }

        if (contentPositions.length > 0) {
          contentPositions.sort(function (p1, p2) {
            return p1.highlight[0] - p2.highlight[0];
          });
          let contentPosition = contentPositions[0];
          let previewPosition = {
            highlight: [contentPosition.highlight],
            previewStart: contentPosition.previewStart,
            previewEnd: contentPosition.previewEnd,
            ellipsesBefore: contentPosition.ellipsesBefore,
            ellipsesAfter: contentPosition.ellipsesAfter,
          };
          let previewPositions = [previewPosition];
          for (let j = 1; j < contentPositions.length; j++) {
            contentPosition = contentPositions[j];
            if (previewPosition.previewEnd < contentPosition.previewStart) {
              previewPosition = {
                highlight: [contentPosition.highlight],
                previewStart: contentPosition.previewStart,
                previewEnd: contentPosition.previewEnd,
                ellipsesBefore: contentPosition.ellipsesBefore,
                ellipsesAfter: contentPosition.ellipsesAfter,
              };
              previewPositions.push(previewPosition);
            } else {
              previewPosition.highlight.push(contentPosition.highlight);
              previewPosition.previewEnd = contentPosition.previewEnd;
              previewPosition.ellipsesAfter = contentPosition.ellipsesAfter;
            }
          }

          const resultPreviews = document.createElement("div");
          resultPreviews.classList.add("match");
          resultsListItem.appendChild(resultPreviews);

          const content = doc.content;
          for (let j = 0; j < Math.min(previewPositions.length, 1); j++) {
            const position = previewPositions[j];

            const resultPreview = document.createElement("div");
            resultPreview.classList.add("preview");
            resultPreviews.appendChild(resultPreview);

            if (position.ellipsesBefore) {
              resultPreview.appendChild(document.createTextNode("... "));
            }
            addHighlightedText(
              resultPreview,
              content,
              position.previewStart,
              position.previewEnd,
              position.highlight
            );
            if (position.ellipsesAfter) {
              resultPreview.appendChild(document.createTextNode(" ..."));
            }
          }
        }
      }

      function addHighlightedText(parent, text, start, end, positions) {
        let index = start;

        for (let i in positions) {
          const position = positions[i];
          const span = document.createElement("span");
          span.innerHTML = text.substring(index, position[0]);
          parent.appendChild(span);
          index = position[0] + position[1];
          const highlight = document.createElement("span");
          highlight.classList.add("highlight");
          highlight.innerHTML = text.substring(position[0], index);
          parent.appendChild(highlight);
        }
        const span = document.createElement("span");
        span.innerHTML = text.substring(index, end);
        parent.appendChild(span);
      }
    }

    cosmos.addEvent(searchInput, "focus", function () {
      setTimeout(update, 0);
    });

    const searchInputCloseButton = document.querySelector(
      ".search-input-wrapper > .close-icon"
    );

    cosmos.addEvent(searchInputCloseButton, "click", function () {
      searchInput.value = "";
    });

    cosmos.addEvent(searchInput, "keyup", function (e) {
      switch (e.keyCode) {
        case 27: // When esc key is pressed, hide the results and clear the field
          searchInput.value = "";
          break;
        case 38: // arrow up
        case 40: // arrow down
        case 13: // enter
          e.preventDefault();
          return;
      }
      update();
    });

    cosmos.addEvent(searchInput, "keydown", function (e) {
      const active = document.querySelector(".search-result.active");
      switch (e.keyCode) {
        case 38: // arrow up
          e.preventDefault();
          if (active) {
            active.classList.remove("active");
            if (active.parentElement.previousSibling) {
              const previous =
                active.parentElement.previousSibling.querySelector(
                  ".search-result"
                );
              previous.classList.add("active");
            }
          }
          return;
        case 40: // arrow down
          e.preventDefault();
          if (active) {
            if (active.parentElement.nextSibling) {
              const next =
                active.parentElement.nextSibling.querySelector(
                  ".search-result"
                );
              active.classList.remove("active");
              next.classList.add("active");
            }
          } else {
            const next = document.querySelector(".search-result");
            if (next) {
              next.classList.add("active");
            }
          }
          return;
        case 13: // enter
          e.preventDefault();
          if (active) {
            active.click();
          } else {
            const first = document.querySelector(".search-result");
            if (first) {
              first.click();
            }
          }
          return;
      }
    });

    cosmos.addEvent(document, "click", function (e) {
      console.log(e.target);
      const resultsList = document.querySelector(
        "#search-results > .search-results-list"
      );
      if (e.target != searchInput && e.target != resultsList) {
        hideSearch();
      }
    });
  }

  cosmos.onReady(function () {
    initBurger();
    initMeetingNotes();
    initSearch();
  });
})((window.cosmos = window.cosmos || {}));

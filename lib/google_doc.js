module.exports = {
  match: function (url) {
    return url.indexOf("docs.google.com/document") > -1;
  },

  prepare: async function(page) {
    await autoScroll(page);
  }
};

async function autoScroll(page){
  await page.evaluate(async () => {
    var editor;

    const editorPromise = new Promise(function(resolve, reject) {
      setTimeout(function() {
        editor = document.querySelectorAll(".kix-appview-editor")[0];
        resolve()
      }, 100);
    });

    var tries = 0;
    while (editor === undefined && tries < 10) {
      tries += 1;
      await editorPromise;
    }

    const scrollHeight = await editor.scrollHeight;

    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 200;
      var timer = setInterval(() => {
          editor.scrollBy(0, distance);
          totalHeight += distance;

          if(totalHeight >= scrollHeight){
              clearInterval(timer);
              setTimeout(function() {
                resolve();
              }, 200);
          }
      }, 20);
    });
  });
}

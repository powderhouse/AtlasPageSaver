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
    const editor = document.querySelectorAll(".kix-appview-editor")[0];
    const scrollHeight = await editor.scrollHeight;

    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 200;
      setTimeout(function() {
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
      }, 200);
    });
  });
}

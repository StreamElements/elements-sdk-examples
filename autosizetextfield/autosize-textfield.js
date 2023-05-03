/* ****  In the following code lines, we will be defining a new composite field
for a custom composite text field that scales the font size to fit width *** */

// Register a custom composite field
let fitties = null;
widget.compositeFields.registerCompositeFieldProvider({
  // first comes the meta data 
  getCompositeFieldMetadata: () => ({
    displayName: 'Autosized Text',
    description: 'A text field that will auto size the font based on textbox width, font size, and number of lines',
    previewImageUrl: import.meta.resolve('./images/format_line_spacing_white_24dp.svg'),
    defaultMimeType: 'text/multiline',
    defaultBaseType: 'text',
    type: 'autoSizeText'
  }),
  // now define the create flow (what happens when a user adds a custom field to the canvas)
  async createCompositeFieldInstance({ compositeFieldId, configState }) {
    const htmlElement = document.createElement('div'); //  Create the base HTML element
    // add the fitty when ever this widget is rendered - works the same for editor and playtime
    function render() {
      const field = configState.settings.compositeFields[compositeFieldId]; // get the data for this specific field d
      if (!field.style.width) { // if the width is not set, return an error message
        window.widget.compositeFields.applyHtmlElementTextContent({
          htmlElement,
          textContent: `A fixed width for autosize fields is required`,
          style: field.style,
          highlightStyle: field.highlightedStyle,
        });
        return;
      }

      const clientWidth = getPropertyInPX(field.style.width);
      const minFontSize = getPropertyInPX(field.style.fontSize);

      // add styles
      window.widget.compositeFields.applyHtmlElementTextContent({
        htmlElement,
        textContent: `${field.text?.[0]?.content}`,
        style: field.style,
        highlightStyle: field.highlightedStyle,
      });
       // measure the width of the field if font size is 5px
      let measuredWidth=measureText(htmlElement.innerHTML,"5px",htmlElement.style.fontFamily);

      // scale it up to the actual width
      //let relFontsize = Math.floor(Math.max(5 * clientWidth / measuredWidth,minFontSize)); // using this line will make the set font size behave as minimal font size
      // let relFontsize = Math.floor(5 * clientWidth / measuredWidth);//  no limit
      let relFontsize = Math.floor(Math.min(5 * clientWidth / measuredWidth, minFontSize)); // using this line will make the set font size behave as maximal font size.
      htmlElement.style.fontSize = relFontsize + 'px';

    }


    // Render initial state
    render();

    // return the schema
    return {
      get compositeFieldSchema() {
        return {
          type: 'autoSizeText',
          baseType: 'text',
          placeholders: {},
          value: htmlElement.innerHTML || 'Enter your text',
          mimeType: 'text/multiline'
        };
      },
      get htmlElement() {
        return htmlElement;
      },
      async dispose() {
        // Unsubscribe from event handlesrs
       
      },
    };
  },
});

// measuring text size
function measureText(text,fontSize,fontFamily){
  const span = document.createElement('span');
  span.style.display = "inline-block";
  span.style.position = "absolute";     
  span.innerHTML = text;
  span.style.fontFamily = fontFamily;
  span.style.fontSize = fontSize;
  span.style.lineHeight = fontSize;
  document.body.appendChild(span)
  let measuredWidth = span.clientWidth;
  document.body.removeChild(span);
  return measuredWidth;
}

// convert any css property to px
function getPropertyInPX(cssValue){
  const span = document.createElement('span');
  span.style.display = "inline-block";  
  span.style.width=cssValue;
  document.body.appendChild(span)
  let meauredPx = span.clientWidth;
  document.body.removeChild(span);
  return meauredPx;
}
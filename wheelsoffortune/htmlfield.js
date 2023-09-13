widget.compositeFields.registerCompositeFieldProvider({
    // first comes the meta data 
    getCompositeFieldMetadata: () => ({
        displayName: "HTML",
        description: "Directly render html instead of text",
        // previewImageUrl: import.meta.resolve("./images/follow.svg"),
        defaultMimeType: "text/multiline",
        defaultBaseType: "text",
        type: "html",
    }),
    async createCompositeFieldInstance({ compositeFieldId, configState }) {
        const field = configState.settings.compositeFields[compositeFieldId]; // get the data for this specific field
        const htmlElement = document.createElement("div");
        const DEFAULT_TEXT_CONTENT_VALUE = "";
        const textContentOrDefaultValue = field.text?.[0]?.content || DEFAULT_TEXT_CONTENT_VALUE;
        function render(){
            window.widget.compositeFields.applyHtmlElementTextContent({ // apply style to field
                htmlElement,
                textContent: textContentOrDefaultValue,
                style: field.style,
                highlightStyle: field.highlightedStyle,
            });
            htmlElement.innerHTML = sanitizeHTML(decodeHTMLEntities(htmlElement.innerHTML));
        }
        render();
        window.widget.events.on('bindableDataVariableValueChanged', render);   

        return {
            get compositeFieldSchema() {
                return {
                    type: "html",
                    baseType: 'text',
                    placeholders: {},
                    text: [
                        {
                            content: textContentOrDefaultValue
                        }
                    ],
                    mimeType: "text/multiline"
                };
            },
            get htmlElement() {
                return htmlElement;
            },
            async dispose() {
                window.widget.events.on('bindableDataVariableValueChanged', render);  
            },
        };
    }
});

function decodeHTMLEntities(text) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}
// clean scripts
function sanitizeHTML(input) {
    // Create a new DOMParser and parse the input
    let doc = new DOMParser().parseFromString(input, 'text/html');

    // Remove <script> elements
    Array.from(doc.querySelectorAll('script')).forEach(el => el.remove());

    // Return the sanitized HTML
    return doc.body.innerHTML;
}
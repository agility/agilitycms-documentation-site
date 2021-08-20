import React, { useState, useEffect, useRef } from "react"
import EditorJS from '@editorjs/editorjs'
import Embed from '@editorjs/embed'
import Table from '@editorjs/table'
import Paragraph from '@editorjs/paragraph'
import Warning from '@editorjs/warning'
import Code from '@editorjs/code'

import Image from '@editorjs/image'
import Raw from '@editorjs/raw'
import Header from '@editorjs/header'
import Quote from '@editorjs/quote'
import Marker from '@editorjs/marker'
import Delimiter from '@editorjs/delimiter'
import InlineCode from '@editorjs/inline-code'
import NestedList from '@editorjs/nested-list'
import DragDrop from 'editorjs-drag-drop'
//import Undo from 'editorjs-undo' //this has bugs...
import LinkAutocomplete from '@editorjs/link-autocomplete' //enable this to support link autocompletes (requires env-vars)

const BlockEditor = () => {

	const [value, setValue] = useState("")
	const [height, setHeight] = useState(500)
	const containerRef = useRef()
    let auth = null;
    let custom = null;
    let editor = null;
    let fieldValue = null;
    

    useEffect(() => {
        //get the field ready to wait for messages from the parent
        console.log('Block Editor => Waiting for message from Agility CMS')
        window.addEventListener("message", function (e) {
            
            //only care about these messages
            if(e.data.type === 'setInitialProps') {
                console.log('Block Editor => Auth, fieldValue received from Agility CMS, setting up editor...')
                auth = e.data.message.auth;
                custom = e.data.message.custom;
                fieldValue = e.data.message.fieldValue ? JSON.parse(e.data.message.fieldValue) : null;
                editor = setupEditor(auth, height, value, setValue, setHeight, containerRef, fieldValue, custom);
            } else {
                //show us the unhandled message...
                console.log("Block Editor => IGNORING MESSAGE FROM PARENT: ", e.data)
            }
        }, false);

        //let the parent know we are NOW ready to receive messages
        if (window.parent) {
            console.log("Block Editor => Notifying CMS this field is ready to receive messages...")
            window.parent.postMessage({
                message: "😀",
                type: 'fieldIsReady'
            }, "*")
        } else {
            console.log("can't post message to parent :(")
        }

    }, []);

	return (
		<div style={{ background: "#fff", padding: '0 10px' }}>
            <span style={{ fontSize: '12px', background: 'rgb(251 230 171 / 48%)', color: '#fb8b00', borderRadius: '5px', padding: '3px 4px', display: 'inline-block', fontWeight: '500'}}>Block Editor (Experimental)</span>
			<div id="editorjs" ref={containerRef}>

			</div>
		</div>

	);

}

const setupEditor = (auth, height, value, setValue, setHeight, containerRef, fieldValue, custom) => {
    
    const editor = new EditorJS({
        autofocus: false, //setting this to true will not do anything because this is in an iframe
        holder: document.querySelector('#editorjs'),
        placeholder: "📝 Enter text, paste images/embed urls, or select a block to add here...",
        tools:{
            table: Table,
            paragraph: {
                class: Paragraph,
                inlineToolbar: true,
            },
            list: {
                class: NestedList,
                inlineToolbar: true
            },
            warning: Warning,
            code: Code,
            image: {
                class: Image,
                config: {
                    endpoints: {
                        byFile: '/api/image/uploadByFile',
                        byUrl: '/api/image/fetchByUrl'
                    },
                    additionalRequestData: { ...auth, ...custom }
                }
            },
            raw: Raw,
            header: Header,
            quote: Quote,
            marker: Marker,
            delimiter: Delimiter,
            inlineCode: InlineCode,
            embed: Embed,
            //enable this if you have env-vars set
            link: {
                class: LinkAutocomplete,
                config: {
                    endpoint: '/api/link/search',
                    queryParam: 'q'
                }
            }
        },
        onChange: () => {

            editor.save().then(outputValue => {
                const v = JSON.stringify(outputValue)
                valueChanged(v, value, setValue)
                heightChanged(containerRef.current.offsetHeight, height, setHeight)

            })

        },
        onReady: () => {
            new DragDrop(editor);
            //const undo = new Undo({editor})

            if(fieldValue && fieldValue.blocks && fieldValue.blocks.length > 0) {
                editor.render(fieldValue);
                //undo.initialize(fieldValue);
            }
            

            //wait 200ms for initial height-sync
            window.setTimeout(function() {
                heightChanged(document.body.clientHeight, height, setHeight)
            }, 200)

            //sync height every second
            window.setInterval(function () {
                heightChanged(document.body.clientHeight, height, setHeight)
            }, 500)
        }

    });

    return editor;
}

const heightChanged = (h, height, setHeight) => {
    if (h === height) return

    setHeight(h)

    if (window.parent) {
        window.parent.postMessage({
            message: h,
            type: 'setHeightCustomField'
        }, "*")
    }

}

const valueChanged = (val, value, setValue) => {

    if (val === value) return

    setValue(val)
    if (window.parent) {
        console.log("posting message to parent...")
        window.parent.postMessage({
            message: val,
            type: 'setNewValueFromCustomField'
        }, "*")
    } else {
        console.log("can't post message to parent :(")
    }
}

export default BlockEditor
import axios from 'axios'

export default async function handler(req, res) {
    if (req.method === 'POST') {
      // Process a POST request
      if(process.env.ENDPOINT_SEND_POSITIVE_FEEDBACK_URL) {
        const endpointRes = await axios.post(process.env.ENDPOINT_SEND_POSITIVE_FEEDBACK_URL, {
            url: req.body.url,
            title: req.body.title
        })
        res.status(200).json({
            success: true,
            message: 'Successfully submitted.'
        })
      } else {
          res.status(500).json({
              success: false,
              message: 'The endpoint to send this data is not set up. Add `ENDPOINT_SEND_POSITIVE_FEEDBACK_URL` environment variable to enable this.'
          })
      }
    } 
  }
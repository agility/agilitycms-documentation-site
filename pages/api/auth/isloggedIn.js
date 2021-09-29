import axios from 'axios'

export default async function handler(req, res) {
    if (req.method === 'GET') {

        const agilityOwinAuth = req.cookies.AgilityAuthOWIN

         // Process a POST request
         res.status(200).json({
            success: true,
            message: agilityOwinAuth
        }) 
    }
    
  }
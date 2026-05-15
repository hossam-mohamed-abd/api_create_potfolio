import rateLimit from "express-rate-limit";

const limiter = rateLimit({

    windowMs:
        24 * 60 * 60 * 1000,

    max: 1,

    message: {
        success: false,
        message:
            "Daily limit reached"
    },

    standardHeaders: true,

    legacyHeaders: false

});

function runMiddleware(req, res, fn) {

    return new Promise((resolve, reject) => {

        fn(req, res, result => {

            if (result instanceof Error) {

                return reject(result);

            }

            return resolve(result);

        });

    });

}

export default async function handler(req, res) {

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "*"
    );

    if (req.method === "OPTIONS") {

        return res.status(200).end();

    }

    /*
      POST only
    */

    if (req.method !== "POST") {

        return res.status(405).json({

            success: false,
            message: "Method not allowed"

        });

    }

    try {

        /*
          Rate limit
        */

        await runMiddleware(
            req,
            res,
            limiter
        );

        const {

            cvBase64,
            htmlTemplate

        } = req.body;

        if (
            !cvBase64 ||
            !htmlTemplate
        ) {

            return res.status(400).json({

                success: false,
                message: "Missing data"

            });

        }

        const prompt = `

You are a senior frontend developer
and AI portfolio builder.

You will receive:

1- CV PDF
2- HTML portfolio template

YOUR TASK:

KEEP:
- same design
- same CSS
- same layout
- same animations
- same structure

ONLY replace content.

Replace:
- Name
- About
- Skills
- Projects
- Experience
- Contact
- Social links
- Certifications

PROJECTS:

Generate projects dynamically
based on CV projects.

IMPORTANT:

1- Do NOT redesign layout.

2- Do NOT remove CSS.

3- Do NOT remove animations.

4- Keep classes unchanged.

5- If profile image missing:

Use:

assets/images/profile.png

Add HTML comment:

PLACE PROFILE IMAGE HERE

6- If project image missing:

Use:

assets/images/projects/project-name.png

Add HTML comments.

7- Generate separate instructions.

8- Return EXACTLY in this format:

===INSTRUCTIONS===

instructions here

===HTML===

full html here

HERE IS THE HTML TEMPLATE:

${htmlTemplate}

    `;

        const response = await fetch(

            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
            process.env.GEMINI_API_KEY,

            {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    contents: [

                        {

                            parts: [

                                {
                                    text: prompt
                                },

                                {
                                    inlineData: {
                                        mimeType: "application/pdf",
                                        data: cvBase64
                                    }
                                }

                            ]

                        }

                    ]

                })

            }

        );

        const data =
            await response.json();

        return res.status(200).json(data);

    }

    catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,
            message: "Server error"

        });

    }

}
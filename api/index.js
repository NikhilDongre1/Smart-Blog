
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const multer = require('multer');
const uploadMiddleware = multer({dest:'uploads/'})
const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

//ai integration 
const API_KEY = process.env.GOOGLE_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });




const salt = bcrypt.genSaltSync(10);
const secret = process.env.JWT_SECRET;

app.use(cors({credentials:true,origin:'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));


mongoose.connect(process.env.MONGO_URL)
.then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB', err));
  
  app.post('/register', async (req,res) => {
    const {username,password} = req.body;
    try{
      const userDoc = await User.create({
        username,
        password:bcrypt.hashSync(password,salt),
      });
      res.json(userDoc);
    } catch(e) {
      console.log(e);
      res.status(400).json(e);
    }
  });
    
  app.post('/login', async (req,res) => {
    const {username,password} = req.body;
    const userDoc = await User.findOne({username});
    // if (!userDoc) {
    //   return res.status(400).json('User not found');
    // }
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
      // logged in
      jwt.sign({username,id:userDoc._id}, secret, {}, (err,token) => {
        if (err) throw err;
        res.cookie('token', token).json({
          id:userDoc._id,
          username,
        });
      });
    } else {
      res.status(400).json('wrong credentials');
    }
  });

  app.get('/profile', (req,res) => {
    const {token} = req.cookies;
    jwt.verify(token, secret, {}, (err,info) => {
      if (err) throw err;
      res.json(info);
    });
  });
  
  app.post('/logout', (req,res) => {
    res.cookie('token', '').json('ok');
  });

  app.post('/post', uploadMiddleware.single('file'),async (req,res) => {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path+'.'+ext;
    fs.renameSync(path,newPath);

    const {token} = req.cookies;
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err;
    const {title,summary,content} = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover:newPath,
      author:info.id,
    });
    res.json(postDoc);
  });

});

app.put('/post',uploadMiddleware.single('file'), async (req,res) => {
  let newPath = null;
  if (req.file) {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path+'.'+ext;
    fs.renameSync(path, newPath);
  }

  const {token} = req.cookies;
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err;
    const {id,title,summary,content} = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json('you are not the author');
    }
    postDoc.title = title;
    postDoc.summary = summary;
    postDoc.content = content;
    if (newPath) {
      postDoc.cover = newPath;
    }

    await postDoc.save();

    res.json(postDoc);
  });

});



app.get('/post', async (req,res) => {
  res.json(
    await Post.find()
      .populate('author', ['username'])
      .sort({createdAt: -1})
      .limit(20)
  );
});

app.get('/post/:id', async (req, res) => {
  const {id} = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  res.json(postDoc);
})


app.post('/chat', async (req, res) => {
  try {
    const { content } = req.body;
    
    const prompt = `Please modify the given content to use proper, conversational English that feels natural and engaging to a human reader.
    Ensure the tone is creative and interesting, grabbing the reader's attention while keeping the flow easy to follow.
    Expand on ideas where necessary to add depth or detail. If the content is very brief, include additional thoughts or supporting information to enrich the post.
    Use HTML tags for formatting to enhance readability, such as <h1>, <h2>, <h3>, <h4>, <h5>, <h6>, <p>, <br>, <b>, <strong>, <i>, <em>, <u>, <mark>, <small>, <del>, <ins>, &nbsp;, &lt;, &gt;, &amp;, &quot;, &apos;, <ul>, <ol>, <li>, <blockquote>, <q>, <code>, <pre>, <samp>, <abbr>, <time>, <figure>, <figcaption>, <hr>, <span> and avoid # or * for formatting the string.
    Do not stray from the main idea provided by the user. Stick closely to their original intent while improving the clarity and quality of the writing.
    Also add some emojis if required.
    The content is: ${content}`;

    const result = await model.generateContent(prompt);
    if (result && result.response && result.response.text) {
      const summary =  result.response.text(); 
      res.send({summary});
    } else {
      res.status(500).send('Unexpected response from the model');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred while processing your request');
  }

});

app.listen(4000, () => {
    console.log('Server is running on http://localhost:4000');
});



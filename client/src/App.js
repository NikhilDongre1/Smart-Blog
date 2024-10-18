import './App.css';
import Layout from './Components/Layout.js';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import IndexPage from './pages/IndexPage.js';
import LoginPage from './pages/LoginPage.js';
import RegisterPage from './pages/RegisterPage.js';
import { UserContextProvider } from './UserContext';
import CreatePost from './pages/CreatePost.js';
import PostPage from './pages/PostPage.js';
import EditPost from './pages/EditPost.js';
function App() {
  return (
    <UserContextProvider>

    <BrowserRouter>
    <Routes>

    <Route path="/" element={<Layout />}>
      <Route index element={ <IndexPage />}/>
      <Route path={'/login'} element={ <LoginPage />}/>
      <Route path={'/register'} element={ <RegisterPage />}/>
      <Route path={'/create'} element={ <CreatePost />}/>
      <Route path="/post/:id" element={<PostPage />} />
      <Route path='/edit/:id' element = {<EditPost />} />
    </Route>

    </Routes>
    </BrowserRouter>
    </UserContextProvider>
  );
}

export default App;

//cors
//cookie-parser
//jasonwebtocken
//router
//bycrypt
// npm i react-quill
// multer
//date fns
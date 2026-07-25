import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Navbar from './Navbar';
import Sidebar from './Sidebar';
export default function MainLayout({ children }) {
    return (_jsxs("div", { className: "min-h-screen bg-gray-100", children: [_jsx(Navbar, {}), _jsxs("div", { className: "flex", children: [_jsx(Sidebar, {}), _jsx("main", { className: "flex-1 p-8", children: children })] })] }));
}

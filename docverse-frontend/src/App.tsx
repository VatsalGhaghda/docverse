import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import MergePDF from "./pages/MergePDF";
import SplitPDF from "./pages/SplitPDF";
import CompressPDF from "./pages/CompressPDF";
import ConvertPDF from "./pages/ConvertPDF";
import OCRPDF from "./pages/OCRPDF";
import ProtectPDF from "./pages/ProtectPDF";
import SignPDF from "./pages/SignPDF";
import PDFToImage from "./pages/PDFToImage";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ConvertToPDF from "./pages/ConvertToPDF";
import UnlockPDF from "./pages/UnlockPDF";
import AddPageNumbers from "./pages/AddPageNumbers";
import PDFToHTML from "./pages/PDFToHTML";
import WatermarkPDF from "./pages/WatermarkPDF";
import OrganizePDF from "./pages/OrganizePDF";
import PDFToWord from "./pages/PDFToWord";
import PDFToExcel from "./pages/PDFToExcel";
import PDFToPowerPoint from "./pages/PDFToPowerPoint";
import WordToPDF from "./pages/WordToPDF";
import ExcelToPDF from "./pages/ExcelToPDF";
import PowerPointToPDF from "./pages/PowerPointToPDF";
import ImageToPDF from "./pages/ImageToPDF";

const queryClient = new QueryClient();

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="docverse-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/merge" element={<MergePDF />} />
            <Route path="/split" element={<SplitPDF />} />
            <Route path="/compress" element={<CompressPDF />} />
            <Route path="/convert" element={<ConvertPDF />} />
            <Route path="/to-pdf" element={<ConvertToPDF />} />
            <Route path="/pdf-to-word" element={<PDFToWord />} />
            <Route path="/pdf-to-excel" element={<PDFToExcel />} />
            <Route path="/pdf-to-powerpoint" element={<PDFToPowerPoint />} />
            <Route path="/word-to-pdf" element={<WordToPDF />} />
            <Route path="/excel-to-pdf" element={<ExcelToPDF />} />
            <Route path="/powerpoint-to-pdf" element={<PowerPointToPDF />} />
            <Route path="/image-to-pdf" element={<ImageToPDF />} />
            <Route path="/ocr" element={<OCRPDF />} />
            <Route path="/protect" element={<ProtectPDF />} />
            <Route path="/unlock" element={<UnlockPDF />} />
            <Route path="/sign" element={<SignPDF />} />
            <Route path="/pdf-to-image" element={<PDFToImage />} />
            <Route path="/page-numbers" element={<AddPageNumbers />} />
            <Route path="/pdf-to-html" element={<PDFToHTML />} />
            <Route path="/organize" element={<OrganizePDF />} />
            <Route path="/watermark" element={<WatermarkPDF />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  FileText, 
  Award, 
  ArrowLeft, 
  Zap, 
  Shield, 
  TrendingUp, 
  Star, 
  CheckCircle, 
  Play, 
  Globe, 
  X,
  Search,
  MessageSquare,
  Trophy,
  Lock,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  Briefcase,
  Target
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Landing = () => {
  // NihuList Landing Page - Cache Bust v2
  const [showUserTypeDialog, setShowUserTypeDialog] = useState(false);
  const [showDemoVideo, setShowDemoVideo] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const navigate = useNavigate();

  const testimonials = [
    {
      name: "דר' מיכל כהן",
      role: "יועצת ניהול, תחום טכנולוגיה",
      company: "יועצת עצמאית",
      image: "👩‍💼",
      quote: "NihuList חיבר אותי עם לקוחות איכותיים שמתאימים בדיוק למומחיות שלי. הפלטפורמה פשוטה וחכמה."
    },
    {
      name: "רון אברהם",
      role: "יזם טכנולוגי",
      company: "TechStart Solutions",
      image: "👨‍💻",
      quote: "מצאתי יועץ שיווק מושלם תוך 24 שעות. החיסכון בזמן והתוצאות המדהימות הפכו את זה לכלי החיוני שלי."
    },
    {
      name: "שרה לוי",
      role: "יועצת עסקית ופיננסית",
      company: "Business Growth Consulting",
      image: "👩‍💼",
      quote: "הרשת של NihuList מביאה לי פרויקטים איכותיים עם לקוחות רציניים. הכי מומלץ ליועצים מקצועיים."
    }
  ];

  const handleUserTypeSelection = (userType: string) => {
    setShowUserTypeDialog(false);
    if (userType === 'entrepreneur') {
      navigate('/auth?type=entrepreneur');
    } else {
      navigate('/auth?type=consultant');
    }
  };

  return <div className="min-h-screen bg-background" dir="rtl">
      {/* Navigation */}
      <nav className="relative z-50 py-4 px-4 lg:px-6 bg-background/80 backdrop-blur-sm border-b border-border/40">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-tech-purple flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-foreground">NihuList</span>
              <span className="text-sm text-muted-foreground">ניהוליסט</span>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <Button variant="ghost" size="sm" className="hidden md:flex">איך זה עובד</Button>
            <Button variant="ghost" size="sm" className="hidden md:flex">אבטחה</Button>
            <Button variant="premium" size="sm" onClick={() => setShowUserTypeDialog(true)} className="text-sm lg:text-base px-6">
              התחל עכשיו
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32 bg-gradient-to-br from-background via-primary/5 to-tech-purple/5">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
            {/* Left content */}
            <div className="space-y-8 text-center lg:text-right">
              {/* Security badge */}
              <div className="animate-fade-in">
                <Badge variant="outline" className="inline-flex items-center gap-2 px-4 py-2 text-sm">
                  <Shield className="w-4 h-4 text-primary" />
                  Data protected with enterprise-grade security
                </Badge>
              </div>

              {/* Main headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight animate-slide-up">
                <span className="gradient-text">NihuList</span>
                <br />
                <span className="text-foreground">Connecting Entrepreneurs and Consultants,</span>
                <br />
                <span className="gradient-text">Smarter and Faster</span>
              </h1>

              {/* Subtext */}
              <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0 animate-slide-up" style={{animationDelay: "0.2s"}}>
                A secure, AI-powered platform for finding the right consultant, every time.
              </p>

              {/* CTA Button */}
              <div className="animate-slide-up" style={{animationDelay: "0.4s"}}>
                <Button 
                  size="xl" 
                  onClick={() => setShowUserTypeDialog(true)}
                  className="text-lg px-8 py-6 animate-glow"
                >
                  <Zap className="w-6 h-6 ml-2" />
                  Get Started
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="space-y-4 animate-fade-in" style={{animationDelay: "0.6s"}}>
                <p className="text-sm text-muted-foreground">Trusted by verified consultants and entrepreneurs</p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-6 text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    +500 פרויקטים
                  </span>
                  <span className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-primary" />
                    +1,000 יועצים מאומתים
                  </span>
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Enterprise Security
                  </span>
                </div>
              </div>
            </div>

            {/* Right content - Hero Image */}
            <div className="flex justify-center lg:justify-end animate-scale-in" style={{animationDelay: "0.3s"}}>
              <div className="relative">
                <div className="w-96 h-96 lg:w-[500px] lg:h-[500px] rounded-3xl bg-gradient-to-br from-primary/20 to-tech-purple/20 flex items-center justify-center">
                  <div className="text-8xl">👨‍💼📱</div>
                </div>
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 w-12 h-12 bg-primary rounded-2xl flex items-center justify-center animate-float">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-tech-purple rounded-2xl flex items-center justify-center animate-float" style={{animationDelay: "1s"}}>
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Credibility Section */}
      <section className="py-16 lg:py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              <span className="text-foreground">Verified Consultants & Entrepreneurs</span>
            </h2>
            <p className="text-xl text-muted-foreground">Carefully screened to ensure trust and quality</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 text-center max-w-4xl mx-auto">
            <div className="space-y-3">
              <div className="text-4xl lg:text-5xl font-black gradient-text">+500</div>
              <div className="text-sm lg:text-base font-medium text-muted-foreground">Projects Created</div>
            </div>
            <div className="space-y-3">
              <div className="text-4xl lg:text-5xl font-black gradient-text">+1,000</div>
              <div className="text-sm lg:text-base font-medium text-muted-foreground">Verified Consultants</div>
            </div>
            <div className="space-y-3">
              <div className="text-4xl lg:text-5xl font-black gradient-text">95%</div>
              <div className="text-sm lg:text-base font-medium text-muted-foreground">Success Rate</div>
            </div>
            <div className="space-y-3">
              <div className="text-4xl lg:text-5xl font-black gradient-text">24/7</div>
              <div className="text-sm lg:text-base font-medium text-muted-foreground">Support</div>
            </div>
          </div>

          {/* Security Banner */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 rounded-full">
              <Lock className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Data protected with enterprise-grade security</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 lg:py-32 bg-background">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              <span className="text-foreground">How</span>
              <span className="gradient-text"> It Works</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Three simple steps to connect with the perfect consultant
            </p>
          </div>
          
          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Step 1 */}
            <Card className="text-center p-8 relative overflow-hidden animate-slide-up" style={{animationDelay: "0.2s"}}>
              <div className="absolute top-4 right-4 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                1
              </div>
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-tech-purple rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold">Create a Project</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Describe your project needs, timeline, and budget. Our AI analyzes your requirements to find the perfect match.
                </p>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="text-center p-8 relative overflow-hidden animate-slide-up" style={{animationDelay: "0.4s"}}>
              <div className="absolute top-4 right-4 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                2
              </div>
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-r from-tech-purple to-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold">Match with Consultants</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Get matched with verified consultants who have the exact expertise you need. View profiles, ratings, and past work.
                </p>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="text-center p-8 relative overflow-hidden animate-slide-up" style={{animationDelay: "0.6s"}}>
              <div className="absolute top-4 right-4 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                3
              </div>
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-tech-purple rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold">Compare & Choose</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Review proposals, compare rates and timelines, then choose the consultant that's the perfect fit for your project.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Audience Section */}
      <section className="py-20 lg:py-32 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* For Entrepreneurs */}
            <Card className="p-8 lg:p-12 text-center lg:text-right animate-slide-up" style={{animationDelay: "0.2s"}}>
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-r from-primary to-tech-purple rounded-2xl flex items-center justify-center mx-auto lg:mx-0 mb-6">
                  <Briefcase className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold mb-4">For Entrepreneurs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Find the right consultants for your business. Save time, reduce costs, and get expert guidance.
                </p>
                <ul className="space-y-3 text-right">
                  <li className="flex items-center gap-3 justify-end">
                    <span>Access to verified consultants</span>
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </li>
                  <li className="flex items-center gap-3 justify-end">
                    <span>AI-powered matching</span>
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </li>
                  <li className="flex items-center gap-3 justify-end">
                    <span>Transparent pricing</span>
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </li>
                </ul>
                <Button className="w-full lg:w-auto mt-6" onClick={() => handleUserTypeSelection('entrepreneur')}>
                  Start as Entrepreneur
                </Button>
              </CardContent>
            </Card>

            {/* For Consultants */}
            <Card className="p-8 lg:p-12 text-center lg:text-right animate-slide-up" style={{animationDelay: "0.4s"}}>
              <CardHeader>
                <div className="w-16 h-16 bg-gradient-to-r from-tech-purple to-primary rounded-2xl flex items-center justify-center mx-auto lg:mx-0 mb-6">
                  <UserCheck className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-3xl font-bold mb-4">For Consultants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Reach new clients and grow your consulting business. Get matched with quality projects.
                </p>
                <ul className="space-y-3 text-right">
                  <li className="flex items-center gap-3 justify-end">
                    <span>Access to quality projects</span>
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </li>
                  <li className="flex items-center gap-3 justify-end">
                    <span>Build your reputation</span>
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </li>
                  <li className="flex items-center gap-3 justify-end">
                    <span>Flexible work schedule</span>
                    <CheckCircle className="w-5 h-5 text-primary" />
                  </li>
                </ul>
                <Button variant="outline" className="w-full lg:w-auto mt-6" onClick={() => handleUserTypeSelection('consultant')}>
                  Join as Consultant
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 lg:py-32 bg-background">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              <span className="text-foreground">What Our Users</span>
              <br />
              <span className="gradient-text">Are Saying</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Real stories from entrepreneurs and consultants who found success on our platform
            </p>
          </div>

          {/* Testimonials Carousel */}
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 lg:p-12 text-center">
              <CardContent>
                <div className="space-y-8">
                  <div className="flex justify-center text-primary text-3xl">
                    {"★".repeat(5)}
                  </div>
                  
                  <blockquote className="text-xl lg:text-2xl italic text-muted-foreground leading-relaxed">
                    "{testimonials[currentTestimonial].quote}"
                  </blockquote>
                  
                  <div className="space-y-2">
                    <div className="text-6xl">{testimonials[currentTestimonial].image}</div>
                    <div className="font-bold text-xl">{testimonials[currentTestimonial].name}</div>
                    <div className="text-muted-foreground">{testimonials[currentTestimonial].role}</div>
                    <div className="text-sm text-primary font-medium">{testimonials[currentTestimonial].company}</div>
                  </div>
                  
                  {/* Navigation */}
                  <div className="flex justify-center items-center gap-4">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setCurrentTestimonial((prev) => prev === 0 ? testimonials.length - 1 : prev - 1)}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                    <div className="flex gap-2">
                      {testimonials.map((_, index) => (
                        <button
                          key={index}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentTestimonial ? 'bg-primary' : 'bg-muted'
                          }`}
                          onClick={() => setCurrentTestimonial(index)}
                        />
                      ))}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setCurrentTestimonial((prev) => prev === testimonials.length - 1 ? 0 : prev + 1)}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Secondary CTA Section */}
      <section className="py-20 lg:py-32 bg-gradient-to-r from-primary via-tech-purple to-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 lg:px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6 leading-tight">
              Ready to Transform
              <br />
              <span className="text-tech-purple-light">Your Business?</span>
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
              Join thousands of entrepreneurs and consultants who are already experiencing the future of professional collaboration
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button 
                variant="hero" 
                size="xl" 
                onClick={() => setShowUserTypeDialog(true)}
                className="text-xl px-12 py-6 bg-white text-primary hover:bg-white/90"
              >
                <Zap className="w-6 h-6 ml-2" />
                Start Your First Project Today
              </Button>
              
              <Button 
                variant="ghost" 
                size="xl" 
                onClick={() => setShowUserTypeDialog(true)}
                className="text-xl px-12 py-6 text-white border-white/30 hover:bg-white/10"
              >
                <UserCheck className="w-6 h-6 ml-2" />
                Join as Verified Consultant
              </Button>
            </div>
            
            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-white/70 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Enterprise Security</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Verified Network</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Preview Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-black mb-6">
              <span className="text-foreground">Frequently Asked</span>
              <span className="gradient-text"> Questions</span>
            </h2>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            <Card className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold mb-2">How does the matching process work?</h3>
                  <p className="text-muted-foreground">Our AI analyzes your project requirements and matches you with consultants who have the exact expertise, experience, and availability you need.</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold mb-2">How are consultants verified?</h3>
                  <p className="text-muted-foreground">Every consultant goes through a rigorous verification process including credential checks, reference calls, and portfolio reviews to ensure quality.</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold mb-2">What kind of projects can I post?</h3>
                  <p className="text-muted-foreground">From business strategy and marketing to technical consulting and financial planning - we support all types of professional consulting projects.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-primary via-tech-purple to-primary text-white py-16">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-bold">NihuList</div>
                  <div className="text-sm text-white/70">ניהוליסט</div>
                </div>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">
                Connecting entrepreneurs and consultants through our secure, AI-powered platform.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-bold">Platform</h4>
              <div className="space-y-3 text-sm">
                <a href="#" className="block text-white/80 hover:text-white transition-colors">How it Works</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">Security</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">Pricing</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">Verified Network</a>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-bold">Resources</h4>
              <div className="space-y-3 text-sm">
                <a href="#" className="block text-white/80 hover:text-white transition-colors">Help Center</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">Blog</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">Case Studies</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">Best Practices</a>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-bold">Contact</h4>
              <div className="space-y-3 text-sm">
                <a href="#" className="block text-white/80 hover:text-white transition-colors">Support</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">Sales</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">Partnerships</a>
                <a href="#" className="block text-white/80 hover:text-white transition-colors">About</a>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-white/70">
            <p>© 2026 NihuList. All rights reserved. Made with ❤️</p>
          </div>
        </div>
      </footer>

      {/* User Type Selection Dialog */}
      <Dialog open={showUserTypeDialog} onOpenChange={setShowUserTypeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-center mb-4">
              Choose Your Path
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid md:grid-cols-2 gap-6 py-6">
            {/* Entrepreneur Option */}
            <Card 
              className="p-8 cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary"
              onClick={() => handleUserTypeSelection('entrepreneur')}
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-r from-primary to-tech-purple rounded-2xl flex items-center justify-center mx-auto">
                  <Briefcase className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3">I'm an Entrepreneur</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    I need to find qualified consultants for my business projects and get expert guidance.
                  </p>
                </div>
                <Button className="w-full">
                  Continue as Entrepreneur
                  <ChevronLeft className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </Card>

            {/* Consultant Option */}
            <Card 
              className="p-8 cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary"
              onClick={() => handleUserTypeSelection('consultant')}
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 bg-gradient-to-r from-tech-purple to-primary rounded-2xl flex items-center justify-center mx-auto">
                  <UserCheck className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-3">I'm a Consultant</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    I want to offer my consulting services and connect with quality clients and projects.
                  </p>
                </div>
                <Button variant="outline" className="w-full">
                  Continue as Consultant
                  <ChevronLeft className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Demo Video Dialog */}
      <Dialog open={showDemoVideo} onOpenChange={setShowDemoVideo}>
        <DialogContent className="max-w-4xl w-[95vw] h-[80vh] p-0 bg-black">
          <DialogHeader className="sr-only">
            <DialogTitle>Demo Video</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-full">
            <Button onClick={() => setShowDemoVideo(false)} variant="ghost" size="sm" className="absolute top-4 right-4 z-10 text-white hover:bg-white/20">
              <X className="w-4 h-4" />
            </Button>
            <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Demo Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full rounded-lg"></iframe>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
};

export default Landing;
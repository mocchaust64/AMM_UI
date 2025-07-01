import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  MessageCircle,
  Mail,
  FileText,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Book,
  Video,
  Users,
} from "lucide-react"

export default function SupportPage() {
  const faqs = [
    {
      question: "How do I connect my wallet?",
      answer:
        "Click the 'Connect Wallet' button in the top right corner and select your preferred wallet (Phantom, Solflare, or Backpack). Make sure you have the wallet extension installed in your browser.",
    },
    {
      question: "What are the fees for swapping tokens?",
      answer:
        "Swap fees vary depending on the route and liquidity. Typically, you'll pay a 0.25% trading fee plus Solana network fees (usually less than $0.01). The exact fees are shown before you confirm any transaction.",
    },
    {
      question: "How do liquidity pools work?",
      answer:
        "Liquidity pools allow you to provide tokens to enable trading. In return, you receive LP tokens representing your share of the pool and earn fees from trades. You can withdraw your liquidity at any time.",
    },
    {
      question: "What is farming/staking?",
      answer:
        "Farming allows you to stake your LP tokens to earn additional rewards. Staking lets you lock up tokens to earn yield. Both help secure the network and provide you with passive income.",
    },
    {
      question: "Is my money safe?",
      answer:
        "SolanaFi is non-custodial, meaning you always control your funds. We never have access to your private keys. However, DeFi involves smart contract risks, so only invest what you can afford to lose.",
    },
    {
      question: "How do I report a bug?",
      answer:
        "You can report bugs through our support ticket system, Discord community, or email us directly. Please include as much detail as possible, including screenshots and steps to reproduce the issue.",
    },
  ]

  const supportTickets = [
    {
      id: "#12345",
      subject: "Swap transaction failed",
      status: "Open",
      priority: "High",
      created: "2 hours ago",
      lastUpdate: "1 hour ago",
    },
    {
      id: "#12344",
      subject: "Cannot connect Phantom wallet",
      status: "In Progress",
      priority: "Medium",
      created: "1 day ago",
      lastUpdate: "6 hours ago",
    },
    {
      id: "#12343",
      subject: "LP rewards not showing",
      status: "Resolved",
      priority: "Low",
      created: "3 days ago",
      lastUpdate: "2 days ago",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Support Center</h1>
              <p className="text-muted-foreground">Get help and find answers to your questions</p>
            </div>

            <Tabs defaultValue="help" className="space-y-6">
              <TabsList>
                <TabsTrigger value="help">Help & FAQ</TabsTrigger>
                <TabsTrigger value="contact">Contact Us</TabsTrigger>
                <TabsTrigger value="tickets">My Tickets</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>

              <TabsContent value="help" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5" />
                        Getting Started
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        New to DeFi? Learn the basics of using our platform.
                      </p>
                      <Button variant="outline" className="w-full bg-transparent">
                        View Guide
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Book className="h-5 w-5" />
                        Documentation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">Comprehensive guides and API documentation.</p>
                      <Button variant="outline" className="w-full bg-transparent">
                        Read Docs
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5" />
                        Video Tutorials
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">Step-by-step video guides for all features.</p>
                      <Button variant="outline" className="w-full bg-transparent">
                        Watch Videos
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Frequently Asked Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {faqs.map((faq, index) => (
                        <AccordionItem key={index} value={`item-${index}`}>
                          <AccordionTrigger>{faq.question}</AccordionTrigger>
                          <AccordionContent>{faq.answer}</AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contact" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Contact Methods</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <MessageCircle className="h-5 w-5 text-blue-500" />
                        <div>
                          <h4 className="font-medium">Discord Community</h4>
                          <p className="text-sm text-muted-foreground">Join our active community</p>
                        </div>
                        <Button size="sm" variant="outline" className="ml-auto bg-transparent">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <Mail className="h-5 w-5 text-green-500" />
                        <div>
                          <h4 className="font-medium">Email Support</h4>
                          <p className="text-sm text-muted-foreground">support@solana-fi.com</p>
                        </div>
                        <Button size="sm" variant="outline" className="ml-auto bg-transparent">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <Users className="h-5 w-5 text-purple-500" />
                        <div>
                          <h4 className="font-medium">Telegram</h4>
                          <p className="text-sm text-muted-foreground">@SolanaFiSupport</p>
                        </div>
                        <Button size="sm" variant="outline" className="ml-auto bg-transparent">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="p-3 bg-muted/50 rounded-lg">
                        <h4 className="font-medium mb-2">Response Times</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Discord:</span>
                            <span>~5 minutes</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Email:</span>
                            <span>~2 hours</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Telegram:</span>
                            <span>~15 minutes</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Submit a Ticket</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Subject</label>
                        <Input placeholder="Brief description of your issue" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <select className="w-full p-2 border rounded-md bg-background">
                          <option>Technical Issue</option>
                          <option>Account Problem</option>
                          <option>Transaction Issue</option>
                          <option>Feature Request</option>
                          <option>Other</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Priority</label>
                        <select className="w-full p-2 border rounded-md bg-background">
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                          <option>Critical</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <Textarea placeholder="Please provide detailed information about your issue..." rows={6} />
                      </div>

                      <Button className="w-full">Submit Ticket</Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="tickets" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>My Support Tickets</CardTitle>
                    <Button>New Ticket</Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {supportTickets.map((ticket) => (
                        <div key={ticket.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{ticket.id}</span>
                              <Badge
                                variant={
                                  ticket.status === "Open"
                                    ? "destructive"
                                    : ticket.status === "In Progress"
                                      ? "default"
                                      : "secondary"
                                }
                              >
                                {ticket.status}
                              </Badge>
                              <Badge variant="outline">{ticket.priority}</Badge>
                            </div>
                            <Button size="sm" variant="outline">
                              View
                            </Button>
                          </div>
                          <h4 className="font-medium mb-2">{ticket.subject}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Created {ticket.created}
                            </span>
                            <span>Last update: {ticket.lastUpdate}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="resources" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        User Guide
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Complete guide to using all platform features.
                      </p>
                      <Button variant="outline" className="w-full bg-transparent">
                        Download PDF
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Book className="h-5 w-5" />
                        API Documentation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">Technical documentation for developers.</p>
                      <Button variant="outline" className="w-full bg-transparent">
                        View Docs
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5" />
                        Tutorials
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">Video tutorials and walkthroughs.</p>
                      <Button variant="outline" className="w-full bg-transparent">
                        Watch Now
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        Security Guide
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">Best practices for keeping your funds safe.</p>
                      <Button variant="outline" className="w-full bg-transparent">
                        Read Guide
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Audit Reports
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Smart contract audit reports and security assessments.
                      </p>
                      <Button variant="outline" className="w-full bg-transparent">
                        View Reports
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Community
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">Join our community forums and discussions.</p>
                      <Button variant="outline" className="w-full bg-transparent">
                        Join Community
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  )
}

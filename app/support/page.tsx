'use client'

import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Mail,
  FileText,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Book,
  Video,
  Users,
} from 'lucide-react'

export default function SupportPage() {
  const faqs = [
    {
      question: 'How do I connect my wallet?',
      answer:
        "Click the 'Connect Wallet' button in the top right corner and select your preferred wallet (Phantom, Solflare, or Backpack). Make sure you have the wallet extension installed in your browser.",
    },
    {
      question: 'What are the fees for swapping tokens?',
      answer:
        "Swap fees vary depending on the route and liquidity. Typically, you'll pay a 0.25% trading fee plus Solana network fees (usually less than $0.01). The exact fees are shown before you confirm any transaction.",
    },
    {
      question: 'How do liquidity pools work?',
      answer:
        'Liquidity pools allow you to provide tokens to enable trading. In return, you receive LP tokens representing your share of the pool and earn fees from trades. You can withdraw your liquidity at any time.',
    },
    {
      question: 'What is farming/staking?',
      answer:
        'Farming allows you to stake your LP tokens to earn additional rewards. Staking lets you lock up tokens to earn yield. Both help secure the network and provide you with passive income.',
    },
    {
      question: 'Is my money safe?',
      answer:
        'MoonDex is non-custodial, meaning you always control your funds. We never have access to your private keys. However, DeFi involves smart contract risks, so only invest what you can afford to lose.',
    },
    {
      question: 'How do I report a bug?',
      answer:
        'You can report bugs through our support ticket system, Discord community, or email us directly. Please include as much detail as possible, including screenshots and steps to reproduce the issue.',
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
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>

              <TabsContent value="help" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5" />
                        UI Source Code
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Frontend source code for the AMM UI project.
                      </p>
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() =>
                          window.open('https://github.com/mocchaust64/AMM_UI', '_blank')
                        }
                      >
                        View on GitHub
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
                      <p className="text-sm text-muted-foreground mb-4">
                        Comprehensive guides and API documentation.
                      </p>
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() =>
                          window.open('https://github.com/mocchaust64/AMM_UI', '_blank')
                        }
                      >
                        UI Source Code
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5" />
                        Program Source
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Solana program source code for the AMM backend.
                      </p>
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() =>
                          window.open(
                            'https://github.com/mocchaust64/CPMMTransferHook/tree/master',
                            '_blank'
                          )
                        }
                      >
                        View on GitHub
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
                        <Mail className="h-5 w-5 text-green-500" />
                        <div>
                          <h4 className="font-medium">Email Support</h4>
                          <p className="text-sm text-muted-foreground">mocchaust64@gmail.com</p>
                        </div>
                        <Button size="sm" variant="outline" className="ml-auto bg-transparent">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <Users className="h-5 w-5 text-purple-500" />
                        <div>
                          <h4 className="font-medium">Telegram</h4>
                          <p className="text-sm text-muted-foreground">@diptz_zyx</p>
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
                        <Textarea
                          placeholder="Please provide detailed information about your issue..."
                          rows={6}
                        />
                      </div>

                      <Button className="w-full">Submit Ticket</Button>
                    </CardContent>
                  </Card>
                </div>
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
                      <p className="text-sm text-muted-foreground mb-4">
                        Technical documentation for developers.
                      </p>
                      <Button
                        variant="outline"
                        className="w-full bg-transparent"
                        onClick={() =>
                          window.open(
                            'https://github.com/mocchaust64/CPMMTransferHook/tree/master',
                            '_blank'
                          )
                        }
                      >
                        Program Source Code
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
                      <p className="text-sm text-muted-foreground mb-4">
                        Video tutorials and walkthroughs.
                      </p>
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
                      <p className="text-sm text-muted-foreground mb-4">
                        Best practices for keeping your funds safe.
                      </p>
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
                      <p className="text-sm text-muted-foreground mb-4">
                        Join our community forums and discussions.
                      </p>
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

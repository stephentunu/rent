import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useIsAdmin, useAdminProfiles, useAdminAgents, useAdminProperties, useAdminPayments,
  useAdminInquiries, useAdminUserRoles, useAdminWallets, useAdminWalletTransactions, useAdminCommissionConfig,
} from "@/hooks/useAdmin";
import { propertiesApi, agentsApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2, Users, Building2, CreditCard, CheckCircle, XCircle, Trash2, Eye,
  Shield, Search, AlertCircle, Wallet, ArrowDownLeft, ArrowUpRight, Percent, UserCheck, UserX, Phone, Mail,
} from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profiles, isLoading: profilesLoading } = useAdminProfiles();
  const { data: agentsList, isLoading: agentsLoading } = useAdminAgents();
  const { data: properties, isLoading: propertiesLoading } = useAdminProperties();
  const { data: payments, isLoading: paymentsLoading } = useAdminPayments();
  const { data: inquiries, isLoading: inquiriesLoading } = useAdminInquiries();
  const { data: userRoles } = useAdminUserRoles();
  const { data: wallets } = useAdminWallets();
  const { data: walletTransactions, isLoading: walletTxLoading } = useAdminWalletTransactions();
  const { data: commissionConfigs } = useAdminCommissionConfig();

  const [searchUsers, setSearchUsers] = useState("");
  const [searchProperties, setSearchProperties] = useState("");
  const [searchAgents, setSearchAgents] = useState("");

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);
  useEffect(() => {
    if (!adminLoading && isAdmin === false) {
      toast({ title: "Access Denied", description: "You don't have admin privileges.", variant: "destructive" });
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate, toast]);

  if (authLoading || adminLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!user || !isAdmin) return null;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(price);

  const getUserRole = (userId: string) => (userRoles as any[])?.find((r) => r.user_id === userId)?.role || "user";

  const pendingProperties = (properties as any[])?.filter((p) => p.status === "pending") || [];
  const activeProperties = (properties as any[])?.filter((p) => p.status === "active") || [];
  const completedPayments = (payments as any[])?.filter((p) => p.status === "completed") || [];
  const totalRevenue = completedPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const verifiedAgents = (agentsList as any[])?.filter((a) => a.is_verified) || [];
  const pendingAgents = (agentsList as any[])?.filter((a) => !a.is_verified) || [];

  const filteredUsers = (profiles as any[])?.filter((p: any) =>
    p.full_name?.toLowerCase().includes(searchUsers.toLowerCase()) ||
    p.email.toLowerCase().includes(searchUsers.toLowerCase())
  ) || [];

  const filteredProperties = (properties as any[])?.filter((p: any) =>
    p.title.toLowerCase().includes(searchProperties.toLowerCase())
  ) || [];

  const filteredAgents = (agentsList as any[])?.filter((a: any) =>
    a.name?.toLowerCase().includes(searchAgents.toLowerCase()) ||
    a.company?.toLowerCase().includes(searchAgents.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchAgents.toLowerCase())
  ) || [];

  const handleApproveProperty = async (id: string) => {
    try {
      await propertiesApi.approve(id);
      toast({ title: "Property approved and now live!" });
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleDeleteProperty = async (id: string) => {
    if (!confirm("Are you sure you want to delete this property?")) return;
    try {
      await propertiesApi.delete(id);
      toast({ title: "Property deleted" });
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleToggleFeatured = async (id: string, currentFeatured: boolean) => {
    try {
      await propertiesApi.toggleFeatured(id, !currentFeatured);
      toast({ title: currentFeatured ? "Removed from featured" : "Added to featured!" });
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleVerifyAgent = async (id: string, currentlyVerified: boolean) => {
    try {
      await agentsApi.verify(id, !currentlyVerified);
      toast({ title: currentlyVerified ? "Agent verification removed" : "Agent verified successfully!" });
      queryClient.invalidateQueries({ queryKey: ["admin-agents"] });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border-b">
          <div className="container-wide py-6">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold">Admin Dashboard</h1>
                <p className="text-muted-foreground">Manage users, agents, properties, and transactions</p>
              </div>
            </div>
          </div>
        </div>

        <div className="container-wide py-8">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="flex flex-wrap w-full max-w-3xl">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="agents">
                Agents
                {pendingAgents.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center">
                    {pendingAgents.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="properties">
                Properties
                {pendingProperties.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-5 p-0 text-xs flex items-center justify-center">
                    {pendingProperties.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="commission"><Percent className="mr-1 h-3.5 w-3.5" />Commission</TabsTrigger>
              <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
            </TabsList>

            {/* ─── Overview ─────────────────────────────────────────────────── */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                  { icon: Users, label: "Total Users", value: (profiles as any[])?.length || 0, color: "bg-primary/10 text-primary" },
                  { icon: UserCheck, label: "Verified Agents", value: verifiedAgents.length, color: "bg-success/10 text-success" },
                  { icon: Building2, label: "Active Properties", value: activeProperties.length, color: "bg-secondary/10 text-secondary" },
                  { icon: AlertCircle, label: "Pending Approval", value: pendingProperties.length, color: "bg-warning/10 text-warning" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <Card key={label}><CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
                      <div><p className="text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></div>
                    </div>
                  </CardContent></Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending agents */}
                <Card>
                  <CardHeader><CardTitle className="text-lg">Agents Awaiting Verification</CardTitle></CardHeader>
                  <CardContent>
                    {pendingAgents.length > 0 ? (
                      <div className="space-y-3">
                        {pendingAgents.slice(0, 5).map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-9 w-9 shrink-0">
                                <AvatarImage src={a.logo} />
                                <AvatarFallback>{a.name?.[0] || "A"}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{a.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{a.company || a.email}</p>
                              </div>
                            </div>
                            <Button size="sm" onClick={() => handleVerifyAgent(a.id, false)}>
                              <UserCheck className="h-3 w-3 mr-1" />Verify
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-muted-foreground text-center py-4">No agents awaiting verification</p>}
                  </CardContent>
                </Card>

                {/* Pending properties */}
                <Card>
                  <CardHeader><CardTitle className="text-lg">Pending Properties</CardTitle></CardHeader>
                  <CardContent>
                    {pendingProperties.length > 0 ? (
                      <div className="space-y-3">
                        {pendingProperties.slice(0, 5).map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{p.title}</p>
                              <p className="text-xs text-muted-foreground">{formatPrice(p.price)}</p>
                            </div>
                            <div className="flex gap-2 ml-2">
                              <Button size="sm" variant="outline" onClick={() => handleApproveProperty(p.id)}><CheckCircle className="h-3 w-3 mr-1" />Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteProperty(p.id)}><XCircle className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-sm text-muted-foreground text-center py-4">No pending properties</p>}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── Agents Tab ───────────────────────────────────────────────── */}
            <TabsContent value="agents">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle>
                        All Agents ({(agentsList as any[])?.length || 0})
                        {pendingAgents.length > 0 && <Badge variant="destructive" className="ml-2">{pendingAgents.length} unverified</Badge>}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">Users who have enabled agent profiles</p>
                    </div>
                    <div className="relative max-w-sm w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search agents..." value={searchAgents} onChange={(e) => setSearchAgents(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {agentsLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                  ) : filteredAgents.length > 0 ? (
                    <div className="space-y-4">
                      {filteredAgents.map((agent: any) => (
                        <div key={agent.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <Avatar className="h-12 w-12 shrink-0">
                              <AvatarImage src={agent.logo} />
                              <AvatarFallback className="text-lg">{agent.name?.[0] || "A"}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold truncate">{agent.name}</p>
                                {agent.is_verified ? (
                                  <Badge className="bg-success/10 text-success border-success/20 text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />Verified
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">Unverified</Badge>
                                )}
                              </div>
                              {agent.company && <p className="text-sm text-muted-foreground truncate">{agent.company}</p>}
                              <div className="flex items-center gap-4 mt-1 flex-wrap">
                                {agent.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{agent.email}</span>}
                                {agent.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{agent.phone}</span>}
                                <span className="text-xs text-primary font-medium">{agent.listing_count || 0} listings</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4 shrink-0">
                            <Button
                              size="sm"
                              variant={agent.is_verified ? "outline" : "default"}
                              onClick={() => handleVerifyAgent(agent.id, agent.is_verified)}
                            >
                              {agent.is_verified ? (
                                <><UserX className="h-3.5 w-3.5 mr-1" />Unverify</>
                              ) : (
                                <><UserCheck className="h-3.5 w-3.5 mr-1" />Verify</>
                              )}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/agents/${agent.id}`)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <UserCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No agents registered yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Users can enable agent profiles in their Profile settings</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Users Tab ────────────────────────────────────────────────── */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle>All Users ({(profiles as any[])?.length || 0})</CardTitle>
                    <div className="relative max-w-sm w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search users..." value={searchUsers} onChange={(e) => setSearchUsers(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {profilesLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Role</TableHead><TableHead>Agent</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {filteredUsers.map((profile: any) => (
                            <TableRow key={profile.id}>
                              <TableCell className="font-medium">{profile.full_name || "—"}</TableCell>
                              <TableCell>{profile.email}</TableCell>
                              <TableCell>{profile.phone || "—"}</TableCell>
                              <TableCell><Badge variant={getUserRole(profile.user_id) === "admin" ? "default" : "secondary"}>{getUserRole(profile.user_id)}</Badge></TableCell>
                              <TableCell>
                                {profile.is_agent ? (
                                  <Badge variant="outline" className="border-success text-success">
                                    {profile.is_verified ? "✓ Verified Agent" : "Agent"}
                                  </Badge>
                                ) : "—"}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Properties Tab ───────────────────────────────────────────── */}
            <TabsContent value="properties">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle>All Properties ({(properties as any[])?.length || 0}){pendingProperties.length > 0 && <Badge variant="destructive" className="ml-2">{pendingProperties.length} pending</Badge>}</CardTitle>
                    <div className="relative max-w-sm w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search properties..." value={searchProperties} onChange={(e) => setSearchProperties(e.target.value)} className="pl-10" /></div>
                  </div>
                </CardHeader>
                <CardContent>
                  {propertiesLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Price</TableHead><TableHead>Status</TableHead><TableHead>Featured</TableHead><TableHead>Listed</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {filteredProperties.map((property: any) => (
                            <TableRow key={property.id}>
                              <TableCell className="font-medium max-w-[200px] truncate">{property.title}</TableCell>
                              <TableCell><Badge variant="outline">{property.listing_type === "sale" ? "Sale" : "Rent"}</Badge></TableCell>
                              <TableCell>{formatPrice(property.price)}</TableCell>
                              <TableCell><Badge variant={property.status === "active" ? "default" : property.status === "pending" ? "secondary" : "destructive"}>{property.status}</Badge></TableCell>
                              <TableCell><Button size="sm" variant={property.is_featured ? "default" : "outline"} onClick={() => handleToggleFeatured(property.id, !!property.is_featured)}>{property.is_featured ? "★" : "☆"}</Button></TableCell>
                              <TableCell className="text-sm text-muted-foreground">{new Date(property.created_at).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => navigate(`/property/${property.id}`)}><Eye className="h-3 w-3" /></Button>
                                  {property.status === "pending" && <Button size="sm" variant="outline" onClick={() => handleApproveProperty(property.id)}><CheckCircle className="h-3 w-3" /></Button>}
                                  <Button size="sm" variant="destructive" onClick={() => handleDeleteProperty(property.id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Payments Tab ─────────────────────────────────────────────── */}
            <TabsContent value="payments">
              <Card>
                <CardHeader><CardTitle>All Payments ({(payments as any[])?.length || 0})</CardTitle></CardHeader>
                <CardContent>
                  {paymentsLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> :
                    (payments as any[])?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader><TableRow><TableHead>Phone</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Receipt</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {(payments as any[]).map((payment: any) => (
                              <TableRow key={payment.id}>
                                <TableCell>{payment.phone_number}</TableCell>
                                <TableCell className="font-medium">{formatPrice(Number(payment.amount))}</TableCell>
                                <TableCell><Badge variant={payment.status === "completed" ? "default" : payment.status === "pending" ? "secondary" : "destructive"}>{payment.status}</Badge></TableCell>
                                <TableCell>{payment.mpesa_receipt_number || "—"}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : <p className="text-center py-8 text-muted-foreground">No payments recorded yet</p>}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Commission Tab ───────────────────────────────────────────── */}
            <TabsContent value="commission">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { icon: Percent, label: "Est. Commission Earned", value: formatPrice(completedPayments.reduce((s: number, p: any) => { const cfg = (commissionConfigs as any[])?.find((c: any) => c.is_active); const pct = cfg ? Number(cfg.commission_percentage) : 5; return s + Math.round(Number(p.amount) * pct / 100); }, 0)), color: "bg-primary/10 text-primary" },
                    { icon: Wallet, label: "Total Wallet Balances", value: formatPrice((wallets as any[])?.reduce((s: number, w: any) => s + Number(w.balance), 0) || 0), color: "bg-secondary/10 text-secondary" },
                    { icon: ArrowUpRight, label: "Total Locked (Escrow)", value: formatPrice((wallets as any[])?.reduce((s: number, w: any) => s + Number(w.locked_balance), 0) || 0), color: "bg-warning/10 text-warning" },
                  ].map(({ icon: Icon, label, value, color }) => (
                    <Card key={label}><CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
                        <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></div>
                      </div>
                    </CardContent></Card>
                  ))}
                </div>
                <Card>
                  <CardHeader><CardTitle className="text-lg">Recent Wallet Transactions</CardTitle></CardHeader>
                  <CardContent>
                    {walletTxLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> :
                      (walletTransactions as any[])?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Description</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {(walletTransactions as any[]).map((tx: any) => (
                                <TableRow key={tx.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {tx.transaction_type === "credit" || tx.transaction_type === "escrow_release" ? <ArrowDownLeft className="h-4 w-4 text-green-600" /> : <ArrowUpRight className="h-4 w-4 text-red-600" />}
                                      <Badge variant="outline" className="capitalize text-xs">{tx.transaction_type.replace("_", " ")}</Badge>
                                    </div>
                                  </TableCell>
                                  <TableCell className={`font-medium ${tx.transaction_type === "credit" || tx.transaction_type === "escrow_release" ? "text-green-600" : "text-red-600"}`}>
                                    {tx.transaction_type === "credit" || tx.transaction_type === "escrow_release" ? "+" : "-"}{formatPrice(Number(tx.amount))}
                                  </TableCell>
                                  <TableCell className="max-w-[250px] truncate">{tx.description || "—"}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : <p className="text-center py-8 text-muted-foreground">No wallet transactions yet</p>}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ─── Inquiries Tab ────────────────────────────────────────────── */}
            <TabsContent value="inquiries">
              <Card>
                <CardHeader><CardTitle>All Inquiries ({(inquiries as any[])?.length || 0})</CardTitle></CardHeader>
                <CardContent>
                  {inquiriesLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> :
                    (inquiries as any[])?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Message</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                          <TableBody>
                            {(inquiries as any[]).map((inquiry: any) => (
                              <TableRow key={inquiry.id}>
                                <TableCell className="font-medium">{inquiry.name}</TableCell>
                                <TableCell>{inquiry.email}</TableCell>
                                <TableCell>{inquiry.phone || "—"}</TableCell>
                                <TableCell className="max-w-[300px] truncate">{inquiry.message}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{new Date(inquiry.created_at).toLocaleDateString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : <p className="text-center py-8 text-muted-foreground">No inquiries yet</p>}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;

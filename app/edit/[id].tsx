import { useEffect,useState } from "react";
import { ActivityIndicator,Pressable,StyleSheet,Text,View } from "react-native";
import { useLocalSearchParams,useRouter } from "expo-router";
import ExpenseForm from "@/components/ExpenseForm";
import { getExpenseById,updateExpense } from "@/db/expenses";
import type { Expense } from "@/types/expense";
export default function EditScreen(){
 const {id}=useLocalSearchParams<{id:string}>();const router=useRouter();const [expense,setExpense]=useState<Expense|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const numericId=Number(id);const invalidId=!Number.isInteger(numericId)||numericId<=0;
 useEffect(()=>{if(invalidId)return;getExpenseById(numericId).then(value=>{if(value)setExpense(value);else setError("Cette dépense est introuvable.");}).catch(()=>setError("Impossible de charger cette dépense.")).finally(()=>setLoading(false));},[invalidId,numericId]);
 if(invalidId)return <View style={s.center}><Text style={s.error}>Cette dépense est introuvable.</Text><Pressable onPress={()=>router.replace("/list")}><Text style={s.link}>Retour à la liste</Text></Pressable></View>;
 if(loading)return <View style={s.center}><ActivityIndicator/><Text>Chargement…</Text></View>;
 if(!expense)return <View style={s.center}><Text style={s.error}>{error}</Text><Pressable onPress={()=>router.replace("/list")}><Text style={s.link}>Retour à la liste</Text></Pressable></View>;
 return <ExpenseForm initialExpense={expense} submitLabel="Enregistrer les modifications" onSubmit={async value=>{await updateExpense(expense.id,value);router.replace("/list");}}/>;
}
const s=StyleSheet.create({center:{flex:1,alignItems:"center",justifyContent:"center",gap:14},error:{color:"#B42318"},link:{color:"#175CD3",fontWeight:"700"}});

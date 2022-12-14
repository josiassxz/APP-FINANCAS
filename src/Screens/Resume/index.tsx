import React, { useState, useCallback } from 'react';
import { ActivityIndicator, Alert, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { VictoryPie } from 'victory-native';
import { addMonths, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTheme } from 'styled-components';

import { HistoryCard } from '../../Components/HistoryCard';
import { TransactionTypeButton } from '../../Components/Form/TransactionTypeButton';

import emptyListImage from '../../assets/opps.png';

import {
  Container,
  LoadContainer,
  Header,
  Title,
  Content,
  ChartContainer,
  MonthSelect,
  MonthSelectButton,
  MonthSelectIcon,
  Month,
  TransactionsTypes,
  ImageContainer,
  ImageEmpty,
  TextEmpty
} from './styles';

import { categories } from '../../utils/categories';

interface TransactionData {
  type: 'positive' | 'negative';
  name: string;
  amount: string;
  category: string;
  date: string;
}

interface CategoryData {
  key: string;
  name: string;
  total: number;
  totalFormatted: string;
  color: string;
  percent: string;
}

export function Resume() {
  
  const [isLoading, setIsLoading] = useState(false);
  const [transactionType, setTransactionType] = useState('negative');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [totalByCategories, setTotalByCategories] = useState<CategoryData[]>([]);

  const theme = useTheme();

  function handleDateChange(action: 'next' | 'prev' ) {
    if (action === 'next') {
      const today = new Date();

      (today.getMonth()===selectedDate.getMonth() && 
      today.getFullYear()===selectedDate.getFullYear()) ?
      Alert.alert('Meses futuros indisponíveis') :
      setSelectedDate(addMonths(selectedDate, 1));
    }else {
      setSelectedDate(subMonths(selectedDate, 1));
    }
  }

  function handleTransactionsTypeSelect(type: 'positive' | 'negative') {
    setTransactionType(type);
  }

  async function loadData() {
    setIsLoading(true);
    const dataKey = '@gofinances:transactions';
    const response = await AsyncStorage.getItem(dataKey);
    const responseFormatted = response ? JSON.parse(response) : [];

    const expensives = responseFormatted
    .filter((expensive : TransactionData) => 
      expensive.type === transactionType &&
      new Date(expensive.date).getMonth() === selectedDate.getMonth() &&
      new Date(expensive.date).getFullYear() === selectedDate.getFullYear()
    );

    const expensiveTotal = expensives
    .reduce((acumullator : number, expensive : TransactionData) => {
      return acumullator + Number(expensive.amount);
    }, 0);

    const totalByCategory : CategoryData[] = [];

    categories.forEach(category => {
      let categorySum = 0;

      expensives.forEach((expensive : TransactionData) => {
        if(expensive.category === category.key) {
          categorySum += Number(expensive.amount);
        }
      });

      if(categorySum>0){
        const total = categorySum
        .toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        });

        const numPercent = categorySum/expensiveTotal *100;
        const percent = `${numPercent < 1 ? numPercent.toFixed(2) : numPercent.toFixed(0)}%`;

        totalByCategory.push({
          key: category.key,
          name: category.name,
          color: category.color,
          total: categorySum,
          totalFormatted: total.replace('R$', 'R$ '),
          percent
        });
      }
    });

    setTotalByCategories(totalByCategory);
    setIsLoading(false);
  }

  useFocusEffect(useCallback(() => {
    loadData();
  },[selectedDate, transactionType]));

  return (
    <Container>
      <Header>
        <Title>Resumo por categoria</Title>
      </Header>

      {
        isLoading ? 
        <LoadContainer>
          <ActivityIndicator 
            color={theme.colors.secondary}
            size="large"
          />
        </LoadContainer> :
        <Content 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: useBottomTabBarHeight(),
          }}
        >

          <MonthSelect>
            <MonthSelectButton onPress={() => handleDateChange('prev')}>
              <MonthSelectIcon name='chevron-left'/>
            </MonthSelectButton>

            <Month>{ format(selectedDate, 'MMMM, yyyy', {locale: ptBR}) }</Month>

            <MonthSelectButton onPress={() => handleDateChange('next')}>
              <MonthSelectIcon name='chevron-right'/>
            </MonthSelectButton>
          </MonthSelect>

          <TransactionsTypes>
            <TransactionTypeButton
              type="up"
              title="Entrada"
              onPress={() => handleTransactionsTypeSelect('positive')}
              isActive={transactionType === 'positive'}
            />
            <TransactionTypeButton
              type="down"
              title="Saída"
              onPress={() => handleTransactionsTypeSelect('negative')}
              isActive={transactionType === 'negative'}
            />
          </TransactionsTypes>

          {totalByCategories.length > 0 ? 
          <>
            <ChartContainer>
              <VictoryPie
                data={totalByCategories}
                colorScale={totalByCategories.map(category => category.color)}
                style={{
                  labels: {
                    fill: 'transparent'
                  }
                }}
                labelRadius={50}
                x="percent"
                y="total"
              />
            </ChartContainer>

            {
              totalByCategories.map(item => (
                <HistoryCard
                  key={item.key}
                  title={item.name}
                  amount={item.totalFormatted}
                  color={item.color}
                  percent={item.percent}
                />
              ))
            }
            </> :
            <ImageContainer>
              <ImageEmpty source={emptyListImage}/>
              <TextEmpty>{transactionType==='negative' ? 'Nenhuma saída cadastrada' : 'Nenhuma entrada cadastrada'}</TextEmpty>
            </ImageContainer>
          }
        </Content>
      }
    </Container>
  )
}
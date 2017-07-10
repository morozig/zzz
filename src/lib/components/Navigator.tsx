import React from 'react';
import HomePage from './HomePage';
import PlayingPage from './PlayingPage';
import { Action } from '../GameReducer';

interface NavigatorProps {
    page: 'Home' | 'Playing';
    dispatch: (action: Action) => void;
}

class Navigator extends React.Component<NavigatorProps, undefined> {
    render() {
        let page;
        switch (this.props.page){
            case 'Home':{
                page = <HomePage
                    dispatch = {this.props.dispatch}
                />;
                break;
            }
            case 'Playing':{
                page = <PlayingPage
                    dispatch = {this.props.dispatch}
                />;
                break;
            }    
        }
        return (
            <div>
                {page}
            </div>
        );
    }
}

export default Navigator;